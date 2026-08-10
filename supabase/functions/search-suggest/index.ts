import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Tier 1: In-Memory LRU Cache for warm Deno isolates (max 200 items, TTL 300s)
const memoryCache = new Map<string, { suggestions: string[]; expiresAt: number }>();

function getFromMemoryCache(key: string): string[] | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.suggestions;
}

function setToMemoryCache(key: string, suggestions: string[], ttlMs = 300_000) {
  if (memoryCache.size >= 200) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, { suggestions, expiresAt: Date.now() + ttlMs });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, locale } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'anon';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let supabase: ReturnType<typeof createClient> | null = null;
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    // Step 1: Check Rate Limit (max 20 requests per 60 seconds per IP)
    if (supabase) {
      try {
        const { data: rlData } = await supabase.rpc('check_rate_limit', {
          p_key: `suggest:ip:${clientIp}`,
          p_max_requests: 20,
          p_window_seconds: 60,
        });

        if (rlData && typeof rlData === 'object' && rlData.allowed === false) {
          const resetSeconds = Number(rlData.reset_in_seconds || 60);
          return new Response(
            JSON.stringify({
              error: 'Rate limit exceeded',
              retryAfter: resetSeconds,
              suggestions: [],
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Retry-After': String(resetSeconds),
              },
            }
          );
        }

        // Periodically trigger background cleanup of expired OTPs and cache (10% sample)
        if (Math.random() < 0.10) {
          supabase.rpc('cleanup_expired_cache_and_otp').then().catch(() => {});
        }
      } catch (rlErr) {
        console.error('[search-suggest] Rate limit check warning:', rlErr);
      }
    }

    const isRtl = locale === 'fa';
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `suggest:${isRtl ? 'fa' : 'en'}:${normalizedQuery}`;

    // Step 2: Tier 1 check (In-Memory LRU)
    const memoryHit = getFromMemoryCache(cacheKey);
    if (memoryHit) {
      return new Response(JSON.stringify({ suggestions: memoryHit }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT-MEMORY',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      });
    }

    // Step 3: Tier 2 check (Postgres Edge Cache)
    if (supabase) {
      try {
        const { data: dbHit } = await supabase.rpc('get_edge_cache', { p_key: cacheKey });
        if (Array.isArray(dbHit) && dbHit.length > 0) {
          setToMemoryCache(cacheKey, dbHit);
          return new Response(JSON.stringify({ suggestions: dbHit }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Cache': 'HIT-DB',
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
            },
          });
        }
      } catch (cacheErr) {
        console.error('[search-suggest] DB cache check warning:', cacheErr);
      }
    }

    // Step 4: Cache MISS - Call AI Gateway (Google Gemini)
    const AI_API_KEY = Deno.env.get('AI_API_KEY');
    if (!AI_API_KEY) {
      throw new Error('AI_API_KEY is not configured');
    }

    const systemPrompt = isRtl
      ? `شما یک دستیار جستجوی هوشمند برای یک پلتفرم مقالات علمی هستید. وقتی کاربر چیزی تایپ می‌کند، ۴ پیشنهاد جستجوی مرتبط و کوتاه (حداکثر ۷ کلمه) به فارسی بده. فقط یک آرایه JSON بدون توضیح اضافه برگردان.`
      : `You are a smart search assistant for an academic articles platform. Given a partial search query, return 4 short, relevant search suggestions (max 7 words each) in English. Return only a JSON array with no extra explanation.`;

    const userPrompt = isRtl
      ? `پیشنهاد جستجو برای: "${query}"`
      : `Search suggestions for: "${query}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.4,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', suggestions: [] }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Payment required', suggestions: [] }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '[]';

    // Extract JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    const rawSuggestions: string[] = match ? JSON.parse(match[0]) : [];
    const suggestions = rawSuggestions.slice(0, 4);

    // Step 5: Store in both cache tiers (TTL = 300s / 5 minutes)
    setToMemoryCache(cacheKey, suggestions, 300_000);
    if (supabase && suggestions.length > 0) {
      supabase
        .rpc('set_edge_cache', {
          p_key: cacheKey,
          p_value: suggestions,
          p_ttl_seconds: 300,
        })
        .then()
        .catch(() => {});
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    console.error('search-suggest error:', e);
    return new Response(
      JSON.stringify({ suggestions: [], error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

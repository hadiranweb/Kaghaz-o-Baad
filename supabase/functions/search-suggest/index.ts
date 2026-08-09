const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const AI_API_KEY = Deno.env.get('AI_API_KEY');
    if (!AI_API_KEY) {
      throw new Error('AI_API_KEY is not configured');
    }

    const isRtl = locale === 'fa';
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
    const suggestions: string[] = match ? JSON.parse(match[0]) : [];

    return new Response(JSON.stringify({ suggestions: suggestions.slice(0, 4) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('search-suggest error:', e);
    return new Response(
      JSON.stringify({ suggestions: [], error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

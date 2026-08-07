import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TONE_PROMPTS: Record<string, { fa: string; en: string }> = {
  formal: { fa: 'رسمی و آکادمیک', en: 'formal and academic' },
  friendly: { fa: 'صمیمی و دوستانه', en: 'friendly and conversational' },
  humorous: { fa: 'طنزآمیز و سرگرم‌کننده', en: 'humorous and entertaining' },
  poetic: { fa: 'شاعرانه و ادبی', en: 'poetic and literary' },
  journalistic: { fa: 'خبری و روزنامه‌نگارانه', en: 'journalistic and newsy' },
  educational: { fa: 'آموزشی و ساده', en: 'educational and simple' },
};

const LENGTH_HINTS: Record<string, { fa: string; en: string }> = {
  short: { fa: 'حدود ۱۵۰ کلمه', en: 'around 150 words' },
  medium: { fa: 'حدود ۴۰۰ کلمه', en: 'around 400 words' },
  long: { fa: 'حدود ۸۰۰ کلمه', en: 'around 800 words' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const source: string = String(body.source ?? '').trim();
    const tone: string = String(body.tone ?? 'formal');
    const targetLang: 'fa' | 'en' = body.targetLang === 'en' ? 'en' : 'fa';
    const length: string = String(body.length ?? 'medium');
    const customPrompt: string = String(body.customPrompt ?? '').trim();

    if (source.length < 30) {
      return new Response(JSON.stringify({ error: 'متن ورودی خیلی کوتاه است' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (source.length > 20000) {
      return new Response(JSON.stringify({ error: 'متن ورودی بیش از حد طولانی است' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tonePref = TONE_PROMPTS[tone] ?? TONE_PROMPTS.formal;
    const lengthPref = LENGTH_HINTS[length] ?? LENGTH_HINTS.medium;

    const systemPrompt = targetLang === 'fa'
      ? `شما یک ویراستار حرفه‌ای فارسی هستید. مقاله ورودی را با لحن ${tonePref.fa} و ${lengthPref.fa} کاملاً بازنویسی کنید. ساختار جملات را تغییر دهید، مثال‌های تازه اضافه کنید، اما معنای اصلی و حقایق را حفظ کنید. خروجی را در قالب Markdown با تیترهای مناسب برگردانید. هیچ توضیح اضافی نده — فقط متن بازنویسی شده.`
      : `You are a professional editor. Completely rewrite the input article in a ${tonePref.en} tone, ${lengthPref.en}. Restructure sentences, add fresh examples, but preserve the core meaning and facts. Return the output in Markdown with appropriate headings. No commentary — only the rewritten article.`;

    const userPrompt = `${customPrompt ? `${targetLang === 'fa' ? 'دستور اضافی کاربر' : 'Additional user instruction'}: ${customPrompt}\n\n` : ''}${targetLang === 'fa' ? 'متن اصلی' : 'Original article'}:\n\n${source}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'محدودیت سرعت — لطفاً کمی صبر کنید' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: 'اعتبار هوش مصنوعی تمام شده است' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[rewrite-article] AI gateway error', aiResponse.status, errText.slice(0, 500));
      return new Response(JSON.stringify({ error: 'AI request failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiResponse.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[rewrite-article] error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
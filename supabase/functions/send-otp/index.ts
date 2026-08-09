import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizeDigits = (value: string) => value
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/\D/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, type } = await req.json();

    if (!identifier || !type || !['email', 'phone'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'email') {
      // Email OTP must come from the auth email itself so the code the user
      // receives is the same code verify-otp validates.
      await supabase.from('otp_codes').delete().eq('identifier', identifier).eq('type', type);

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: identifier,
        options: {
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        console.error('[send-otp] Email OTP send error:', JSON.stringify({
          message: otpError.message,
          status: otpError.status,
          name: otpError.name,
        }));
        return new Response(JSON.stringify({ error: 'Failed to send email code' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[send-otp] Email OTP requested', JSON.stringify({
        emailDomain: identifier.split('@')[1] ?? 'unknown',
      }));

      return new Response(JSON.stringify({ success: true, message: 'OTP sent' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate cryptographically secure 6-digit OTP for SMS only.
    const randBuf = new Uint32Array(1);
    crypto.getRandomValues(randBuf);
    const code = ((randBuf[0] % 900000) + 100000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Delete old OTPs for this identifier
    await supabase.from('otp_codes').delete().eq('identifier', identifier).eq('type', type);

    // Store new OTP
    const { error: insertError } = await supabase.from('otp_codes').insert({
      identifier,
      code,
      type,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to generate OTP' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const smsirApiKey = Deno.env.get('SMSIR_API_KEY');
      if (!smsirApiKey) {
        console.error('SMSIR_API_KEY not configured');
        return new Response(JSON.stringify({ error: 'SMS service not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Clean phone number
      let phoneNumber = identifier.replace(/\s+/g, '').replace(/^(\+98|0098)/, '0');
      if (!phoneNumber.startsWith('0')) {
        phoneNumber = '0' + phoneNumber;
      }

      // Step 1: Resolve line number. Prefer cached secret (avoids slow/timeout
      // GET https://api.sms.ir/v1/line from edge runtime); fall back to API.
      let lineNumber: string | null = null;
      const cachedLine = Deno.env.get("SMSIR_LINE_NUMBER");
      const normalizedCachedLine = cachedLine ? normalizeDigits(cachedLine) : '';
      console.log('[send-otp] SMSIR_LINE_NUMBER status:', JSON.stringify({
        configured: Boolean(cachedLine),
        rawLength: cachedLine?.length ?? 0,
        digitLength: normalizedCachedLine.length,
      }));
      if (normalizedCachedLine.length > 0) {
        lineNumber = normalizedCachedLine;
      } else {
        const lineLookupStart = Date.now();
        try {
          console.log('[send-otp] Falling back to SMS.ir line lookup API');
          const linesResponse = await fetch("https://api.sms.ir/v1/line", {
            method: "GET",
            headers: { "Accept": "application/json", "X-API-KEY": smsirApiKey },
            signal: AbortSignal.timeout(5000),
          });
          const linesText = await linesResponse.text();
          console.log('[send-otp] Line lookup response', JSON.stringify({
            status: linesResponse.status,
            ok: linesResponse.ok,
            durationMs: Date.now() - lineLookupStart,
            bodyPreview: linesText.slice(0, 500),
          }));
          const linesResult = linesText ? JSON.parse(linesText) : {};
          if (linesResult.status === 1 && linesResult.data?.length > 0) {
            lineNumber = normalizeDigits(String(linesResult.data[0].lineNumber ?? linesResult.data[0]));
            console.log('[send-otp] Resolved line from API:', lineNumber);
          } else {
            console.error('[send-otp] Line lookup returned no usable data', JSON.stringify(linesResult));
          }
        } catch (e) {
          console.error('[send-otp] Line lookup request failed', JSON.stringify({
            name: (e as Error)?.name,
            message: (e as Error)?.message,
            durationMs: Date.now() - lineLookupStart,
          }));
        }
      }

      if (!lineNumber) {
        console.error('[send-otp] No valid line number found from SMS.ir', JSON.stringify({
          hasCachedLine: Boolean(cachedLine),
          normalizedLength: normalizedCachedLine.length,
        }));
        return new Response(JSON.stringify({ error: 'شماره خط پیامکی یافت نشد' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Step 2: Send SMS using bulk API
      let smsResponse: Response;
      let smsResult: unknown;
      const sendStart = Date.now();
      const sendPayload = {
        lineNumber: Number(lineNumber),
        messageText: `کد تأیید شما: ${code}`,
        mobiles: [phoneNumber],
      };
      console.log('[send-otp] Sending SMS', JSON.stringify({
        lineNumber: sendPayload.lineNumber,
        mobileMasked: phoneNumber.replace(/(\d{4})\d+(\d{2})/, '$1****$2'),
      }));
      try {
        smsResponse = await fetch("https://api.sms.ir/v1/send/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-API-KEY": smsirApiKey,
          },
          body: JSON.stringify(sendPayload),
          signal: AbortSignal.timeout(7000),
        });
        const responseText = await smsResponse.text();
        console.log('[send-otp] SMS send raw response', JSON.stringify({
          status: smsResponse.status,
          ok: smsResponse.ok,
          durationMs: Date.now() - sendStart,
          bodyPreview: responseText.slice(0, 500),
        }));
        smsResult = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('[send-otp] SMS send request failed', JSON.stringify({
          name: (e as Error)?.name,
          message: (e as Error)?.message,
          durationMs: Date.now() - sendStart,
        }));
        return new Response(JSON.stringify({ error: 'SMS provider timeout' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!smsResponse.ok || (smsResult as { status?: number }).status !== 1) {
        console.error('[send-otp] SMS send rejected by provider', JSON.stringify({
          httpStatus: smsResponse.status,
          providerStatus: (smsResult as { status?: number })?.status,
          result: smsResult,
        }));
        return new Response(JSON.stringify({ error: 'Failed to send SMS', details: smsResult }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    return new Response(JSON.stringify({ success: true, message: 'OTP sent' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

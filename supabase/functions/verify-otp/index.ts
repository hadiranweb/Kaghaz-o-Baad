import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, code: rawCode, type, first_name, last_name, phone } = await req.json();

    // Normalize: convert Persian/Arabic digits to ASCII, strip non-digits,
    // then extract the first 6-digit sequence (in case user pasted the full
    // email body or a confirmation link containing extra characters).
    const normalizeDigits = (value: string) => String(value ?? '')
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    const normalized = normalizeDigits(rawCode);
    const match = normalized.match(/\d{6}/);
    const code = match ? match[0] : normalized.replace(/\D/g, '');

    if (!identifier || !code || !type) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'email') {
      const emailOtpTypes = ['email', 'magiclink', 'signup'] as const;
      let verifiedSession = null;
      let verifiedUser = null;
      let lastVerifyError = null;
      let verifiedType = null;

      for (const emailOtpType of emailOtpTypes) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          email: identifier,
          token: code,
          type: emailOtpType,
        });

        if (verifyData.session && verifyData.user) {
          verifiedSession = verifyData.session;
          verifiedUser = verifyData.user;
          verifiedType = emailOtpType;
          break;
        }

        lastVerifyError = verifyError;
      }

      if (!verifiedSession || !verifiedUser) {
        console.error('[verify-otp] Email OTP verification failed:', JSON.stringify({
          message: lastVerifyError?.message,
          status: lastVerifyError?.status,
          name: lastVerifyError?.name,
        }));
        return new Response(JSON.stringify({ error: 'Invalid or expired email code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', verifiedUser.id)
        .maybeSingle();

      console.log('[verify-otp] Email OTP verified', JSON.stringify({
        userId: verifiedUser.id,
        verifiedType,
        hasProfile: Boolean(profile),
      }));

      return new Response(JSON.stringify({
        success: true,
        session: verifiedSession,
        is_new_user: !profile,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find valid OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('identifier', identifier)
      .eq('code', code)
      .eq('type', type)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Don't mark as verified yet - wait until auth succeeds

    // Create or get user via Supabase Auth
    // Determine email - for phone auth, create a placeholder email
    const email = type === 'email' ? identifier : `${identifier.replace(/[^0-9]/g, '')}@phone.local`;
    // Cryptographically secure random password helper
    const securePassword = () => {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '') + 'Aa1!';
    };
    const password = securePassword();

    // Try to sign in first (existing user)
    let session = null;
    let userId = null;

    // Check if user exists by looking up profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id, phone')
      .or(type === 'email' ? `user_id.not.is.null` : `phone.eq.${identifier}`)
      .limit(10);

    // Try to find user by email in auth
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existingUser = userList?.users?.find(u => {
      if (type === 'email') return u.email === identifier;
      // For phone, check user metadata or profile
      return u.email === email || u.phone === identifier;
    });

    if (existingUser) {
      // Generate a session for existing user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: existingUser.email!,
      });

      if (sessionError) {
        console.error('Session generation error:', sessionError);
      }

      // Use admin to create a session directly
      // Sign in the user by updating their password temporarily and signing in
      const tempPassword = securePassword();
      await supabase.auth.admin.updateUserById(existingUser.id, { password: tempPassword });
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: existingUser.email!,
        password: tempPassword,
      });

      // Immediately rotate to a new unknown password to invalidate the temp credential
      if (signInData?.session) {
        await supabase.auth.admin.updateUserById(existingUser.id, { password: securePassword() });
      }

      if (signInError) {
        console.error('Sign in error:', signInError);
        return new Response(JSON.stringify({ error: 'Authentication failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      session = signInData.session;
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: first_name || '',
          last_name: last_name || '',
          phone: type === 'phone' ? identifier : (phone || ''),
        },
      });

      if (createError) {
        console.error('Create user error:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create account' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = newUser.user.id;

      // Sign in the new user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('New user sign in error:', signInError);
        return new Response(JSON.stringify({ error: 'Failed to sign in' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      session = signInData.session;
    }

    // Mark OTP as verified and clean up only after successful auth
    await supabase.from('otp_codes').update({ verified: true }).eq('id', otpData.id);
    await supabase.from('otp_codes').delete().eq('id', otpData.id);

    return new Response(JSON.stringify({
      success: true,
      session,
      is_new_user: !existingUser,
    }), {
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

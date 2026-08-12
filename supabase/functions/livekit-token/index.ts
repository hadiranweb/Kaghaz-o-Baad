import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { AccessToken } from 'npm:livekit-server-sdk@2.10.2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token)
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claims.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load session via service role to bypass RLS for room metadata
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: session, error: sErr } = await admin
      .from('live_sessions')
      .select('id, host_user_id, room_name, status, max_participants, e2ee_enabled, article_id, presentation_enabled')
      .eq('id', sessionId)
      .maybeSingle()

    if (sErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (session.status === 'ended' || session.status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'Session is ' + session.status }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // بررسی نقش‌های کاربر برای نگاشت آبشاری به نقش‌های زنده (host | speaker | viewer)
    const { data: userRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    const appRoles = (userRoles ?? []).map((r: { role: string }) => r.role)
    const isAdmin = appRoles.includes('admin')
    const isEditor = appRoles.includes('editor')

    const isHost = session.host_user_id === userId || isAdmin
    const role: 'host' | 'speaker' | 'viewer' = isHost ? 'host' : (isEditor ? 'speaker' : 'viewer')

    // Get display name from profile
    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .maybeSingle()
    const displayName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'User'
      : 'User'

    const apiKey = Deno.env.get('LIVEKIT_API_KEY')!
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')!
    const livekitUrl = Deno.env.get('LIVEKIT_URL')!

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: displayName,
      ttl: 60 * 60 * 2, // 2 hours
    })
    at.addGrant({
      room: session.room_name,
      roomJoin: true,
      canPublish: isHost || isEditor, // میزبان و ویرایشگر می‌توانند پخش کنند
      canSubscribe: true,
      canPublishData: true,           // chat / reactions
      roomRecord: isHost,
      roomAdmin: isHost,
    })

    const jwt = await at.toJwt()

    // Record participant join (best-effort; uses user JWT, RLS enforces own row)
    await supabase.from('live_participants').insert({
      session_id: sessionId,
      user_id: userId,
      role,
    })

    // If host joining a scheduled session → mark live
    if (isHost && session.status === 'scheduled') {
      await admin
        .from('live_sessions')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('id', sessionId)
    }

    return new Response(
      JSON.stringify({
        token: jwt,
        url: livekitUrl,
        room: session.room_name,
        role,
        identity: userId,
        name: displayName,
        e2ee_enabled: !!(session as Record<string, unknown>).e2ee_enabled,
        article_id: ((session as Record<string, unknown>).article_id as string) || null,
        presentation_enabled: (session as Record<string, unknown>).presentation_enabled !== false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('livekit-token error', e)
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

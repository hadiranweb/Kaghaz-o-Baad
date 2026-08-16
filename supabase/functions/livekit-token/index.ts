import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { AccessToken } from 'npm:livekit-server-sdk@2.10.2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token)
    if (cErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401)
    const userId = claims.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
    if (!sessionId) return json({ error: 'sessionId required' }, 400)

    const apiKey = Deno.env.get('LIVEKIT_API_KEY')
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
    const livekitUrl = Deno.env.get('LIVEKIT_URL')

    if (!apiKey || !apiSecret || !livekitUrl) {
      return json({
        error: 'LIVEKIT_NOT_CONFIGURED',
        message:
          'LiveKit server is not configured yet. Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET, then deploy this function.',
      }, 503)
    }

    // Load session via service role to bypass RLS for room metadata
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: session, error: sErr } = await admin
      .from('live_sessions')
      .select(
        'id, host_user_id, room_name, status, max_participants, e2ee_enabled, article_id, presentation_enabled, presentation_media_id',
      )
      .eq('id', sessionId)
      .maybeSingle()

    if (sErr || !session) return json({ error: 'Session not found' }, 404)
    if (session.status === 'ended' || session.status === 'cancelled') {
      return json({ error: 'Session is ' + session.status }, 403)
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

    // ——— فایل ارائه متصل به جلسه: لینک امضاشدهٔ کوتاه‌مدت برای اعضای جلسه ———
    let presentationUrl: string | null = null
    let presentationName: string | null = null
    let presentationKind: 'pdf' | 'image' | 'pptx' | 'other' | null = null

    const presId = (session as Record<string, unknown>).presentation_media_id as string | null
    if (presId) {
      const { data: media } = await admin
        .from('media')
        .select('src_url, title_fa, title_en, meta')
        .eq('id', presId)
        .maybeSingle()

      if (media) {
        presentationName = media.title_fa || media.title_en || 'Presentation'
        const meta = (media.meta ?? {}) as { storage_path?: string; mime?: string }
        const mime = meta.mime ?? ''
        if (mime.startsWith('image/')) presentationKind = 'image'
        else if (mime === 'application/pdf') presentationKind = 'pdf'
        else if (mime.includes('presentation') || mime.includes('powerpoint')) presentationKind = 'pptx'
        else presentationKind = 'other'

        const storagePath = meta.storage_path
        if (storagePath) {
          const { data: signed } = await admin.storage
            .from('media')
            .createSignedUrl(storagePath, 60 * 60 * 4) // 4 ساعت
          presentationUrl = signed?.signedUrl ?? null
        }
      }
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: displayName,
      metadata: JSON.stringify({ role }), // نمایش نقش زنده در کنار نام شرکت‌کننده
      attributes: { role },
      ttl: 60 * 60 * 2, // 2 hours
    })
    at.addGrant({
      room: session.room_name,
      roomJoin: true,
      canPublish: isHost || isEditor, // میزبان و ویرایشگر می‌توانند پخش کنند
      canSubscribe: true,
      canPublishData: true,           // chat / reactions / همگام‌سازی اسلاید
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

    return json({
      token: jwt,
      url: livekitUrl,
      room: session.room_name,
      role,
      identity: userId,
      name: displayName,
      session_status: session.status,
      e2ee_enabled: !!(session as Record<string, unknown>).e2ee_enabled,
      article_id: ((session as Record<string, unknown>).article_id as string) || null,
      presentation_enabled: (session as Record<string, unknown>).presentation_enabled !== false,
      presentation_media_id: presId,
      presentation_url: presentationUrl,
      presentation_name: presentationName,
      presentation_kind: presentationKind,
    })
  } catch (e) {
    console.error('livekit-token error', e)
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})

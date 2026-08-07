import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { WebhookReceiver } from 'npm:livekit-server-sdk@2.10.2'

// LiveKit (self-hosted) sends room/track events to this endpoint.
// Configure on your LiveKit server:
//   webhook:
//     api_key: <LIVEKIT_API_KEY>
//     urls:
//       - https://<project-ref>.supabase.co/functions/v1/livekit-webhook

const receiver = new WebhookReceiver(
  Deno.env.get('LIVEKIT_API_KEY')!,
  Deno.env.get('LIVEKIT_API_SECRET')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.text()
    const authHeader = req.headers.get('Authorization') ?? ''
    const event = await receiver.receive(body, authHeader)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (event.event === 'room_finished' && event.room?.name) {
      // Mark matching session ended
      const { data: session } = await admin
        .from('live_sessions')
        .select('id, status')
        .eq('room_name', event.room.name)
        .maybeSingle()

      if (session && session.status !== 'ended') {
        await admin
          .from('live_sessions')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', session.id)
      }
    }

    if (event.event === 'participant_left' && event.participant?.identity && event.room?.name) {
      const { data: session } = await admin
        .from('live_sessions')
        .select('id')
        .eq('room_name', event.room.name)
        .maybeSingle()
      if (session) {
        await admin
          .from('live_participants')
          .update({ left_at: new Date().toISOString() })
          .eq('session_id', session.id)
          .eq('user_id', event.participant.identity)
          .is('left_at', null)
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('livekit-webhook error', e)
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
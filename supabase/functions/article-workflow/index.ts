import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const getBearerToken = (req: Request) => {
  const header = req.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

const allowedActions = new Set([
  'submit_for_review',
  'request_changes',
  'approve',
  'schedule',
  'publish',
  'archive',
  'restore_draft',
])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = getBearerToken(req)
  if (!token) return json({ error: 'unauthorized' }, 401)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !anonKey) return json({ error: 'supabase_not_configured' }, 503)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claims?.claims?.sub) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const articleId = typeof body.articleId === 'string' ? body.articleId : ''
    const action = typeof body.action === 'string' ? body.action : ''
    const note = typeof body.note === 'string' ? body.note : null
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata
      : {}

    if (!articleId || !action || !allowedActions.has(action)) {
      return json({ error: 'invalid_input' }, 400)
    }

    const { data, error } = await userClient.rpc('transition_article_workflow', {
      p_article_id: articleId,
      p_action: action,
      p_note: note,
      p_metadata: metadata,
    })

    if (error) {
      const message = error.message ?? ''
      if (message.includes('article_not_found')) return json({ error: 'article_not_found' }, 404)
      if (message.includes('workflow_transition_forbidden')) return json({ error: 'forbidden_transition' }, 403)
      if (message.includes('unauthorized')) return json({ error: 'unauthorized' }, 401)
      console.error('[article-workflow] rpc error', error)
      return json({ error: 'workflow_failed' }, 500)
    }

    return json({ ok: true, transition: Array.isArray(data) ? data[0] ?? null : data })
  } catch (error) {
    console.error('[article-workflow] unexpected error', error)
    return json({ error: 'unexpected_error' }, 500)
  }
})

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const getToken = (req: Request) => {
  const header = req.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = getToken(req)
  if (!token) return json({ error: 'unauthorized' }, 401)

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_ANON_KEY')
    if (!url || !key) return json({ error: 'supabase_not_configured' }, 503)

    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: claims, error: claimsError } = await client.auth.getClaims(token)
    if (claimsError || !claims?.claims?.sub) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const action = body.action
    if (action === 'create') {
      const articleId = typeof body.articleId === 'string' ? body.articleId : ''
      const commentBody = typeof body.body === 'string' ? body.body : ''
      const source = body.source === 'ai' ? 'ai' : 'human'
      const suggestedText = typeof body.suggestedText === 'string' ? body.suggestedText : null
      const anchor = body.anchor && typeof body.anchor === 'object' && !Array.isArray(body.anchor)
        ? body.anchor
        : {}
      if (!articleId || !commentBody.trim()) return json({ error: 'invalid_input' }, 400)

      const { data, error } = await client.rpc('create_article_comment', {
        p_article_id: articleId,
        p_body: commentBody,
        p_source: source,
        p_suggested_text: suggestedText,
        p_anchor: anchor,
      })
      if (error) return mapRpcError(error.message)
      return json({ ok: true, comment: data })
    }

    if (action === 'resolve') {
      const commentId = typeof body.commentId === 'string' ? body.commentId : ''
      const status = typeof body.status === 'string' ? body.status : ''
      if (!commentId || !status) return json({ error: 'invalid_input' }, 400)

      const { data, error } = await client.rpc('resolve_article_comment', {
        p_comment_id: commentId,
        p_status: status,
      })
      if (error) return mapRpcError(error.message)
      return json({ ok: true, comment: data })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (error) {
    console.error('[article-comment] unexpected error', error)
    return json({ error: 'unexpected_error' }, 500)
  }
})

function mapRpcError(message: string) {
  if (message.includes('unauthorized')) return json({ error: 'unauthorized' }, 401)
  if (message.includes('article_not_found')) return json({ error: 'article_not_found' }, 404)
  if (message.includes('comment_forbidden') || message.includes('comment_forbidden_or_not_found')) {
    return json({ error: 'forbidden' }, 403)
  }
  if (message.includes('invalid_comment')) return json({ error: 'invalid_input' }, 400)
  console.error('[article-comment] rpc error', message)
  return json({ error: 'comment_operation_failed' }, 500)
}

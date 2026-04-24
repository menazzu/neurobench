const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Invalid token' }, 401)
    }

    const adminId = userData.user.id
    const { data: adminCheck } = await adminClient
      .from('admin_users')
      .select('id')
      .eq('user_id', adminId)
      .maybeSingle()

    if (!adminCheck) {
      return jsonResponse({ error: 'Not an admin' }, 403)
    }

    const { action, user_id } = await req.json()

    if (!action || !user_id) {
      return jsonResponse({ error: 'Missing action or user_id' }, 400)
    }

    if (action === 'delete_user') {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('user_id')
        .eq('user_id', user_id)
        .maybeSingle()

      if (!profile) {
        return jsonResponse({ error: 'User not found' }, 404)
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
      if (deleteError) {
        return jsonResponse({ error: deleteError.message }, 500)
      }

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)

  } catch (err) {
    return jsonResponse({ error: err.message || 'Internal server error' }, 500)
  }
})

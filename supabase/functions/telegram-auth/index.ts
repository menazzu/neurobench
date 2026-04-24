import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const keyBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyTelegramHash(authData: Record<string, string>): Promise<boolean> {
  const hash = authData.hash
  const data = { ...authData }
  delete data.hash
  const checkString = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('\n')
  const computedHash = await hmacSha256(Deno.env.get('TELEGRAM_BOT_TOKEN')!, checkString)
  return computedHash === hash
}

async function generatePassword(telegramId: string): Promise<string> {
  const hash = await hmacSha256(Deno.env.get('SESSION_SECRET')!, telegramId)
  return hash.slice(0, 32)
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { auth_data, invite_code } = await req.json()

    if (!auth_data || !auth_data.hash || !auth_data.id) {
      return jsonResponse({ error: 'Missing auth data' }, 400)
    }

    if (!await verifyTelegramHash(auth_data)) {
      return jsonResponse({ error: 'Invalid Telegram authentication' }, 401)
    }

    const authDate = parseInt(auth_data.auth_date)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) {
      return jsonResponse({ error: 'Auth data expired, try again' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const anonClient = createClient(supabaseUrl, anonKey)

    const telegramId = auth_data.id.toString()
    const email = `telegram_${telegramId}@neurobench.local`
    const password = await generatePassword(telegramId)

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle()

    if (existingProfile) {
      const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({ email, password })

      if (sessionError) {
        await adminClient.auth.admin.updateUserById(existingProfile.user_id, { password })
        const retry = await anonClient.auth.signInWithPassword({ email, password })
        if (retry.error) {
          return jsonResponse({ error: 'Failed to create session' }, 500)
        }
        return jsonResponse({
          access_token: retry.data.session.access_token,
          refresh_token: retry.data.session.refresh_token,
          is_new: false
        })
      }

      await adminClient
        .from('profiles')
        .update({
          telegram_username: auth_data.username || null,
          telegram_first_name: auth_data.first_name || null,
          telegram_last_name: auth_data.last_name || null,
          telegram_photo_url: auth_data.photo_url || null
        })
        .eq('user_id', existingProfile.user_id)

      return jsonResponse({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        is_new: false
      })
    }

    if (!invite_code) {
      return jsonResponse({ error: 'Для регистрации нужен инвайт-код', needs_invite: true }, 400)
    }

    const { data: validCode } = await adminClient
      .from('invite_codes')
      .select('id')
      .eq('code', invite_code.toUpperCase())
      .is('used_by', null)
      .maybeSingle()

    if (!validCode) {
      return jsonResponse({ error: 'Инвайт-код недействителен или уже использован' }, 400)
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        telegram_id: telegramId,
        invite_code: invite_code.toUpperCase()
      }
    })

    if (createError || !newUser) {
      return jsonResponse({ error: 'Не удалось создать аккаунт' }, 500)
    }

    await adminClient
      .from('profiles')
      .update({
        telegram_id: telegramId,
        telegram_username: auth_data.username || null,
        telegram_first_name: auth_data.first_name || null,
        telegram_last_name: auth_data.last_name || null,
        telegram_photo_url: auth_data.photo_url || null,
        is_verified: true,
        used_invite_code_id: validCode.id,
        pending_invite_code: null
      })
      .eq('user_id', newUser.id)

    await adminClient
      .from('invite_codes')
      .update({ used_by: newUser.id, used_at: new Date().toISOString() })
      .eq('id', validCode.id)

    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({ email, password })

    if (sessionError || !sessionData) {
      return jsonResponse({ error: 'Аккаунт создан, но не удалось создать сессию' }, 500)
    }

    return jsonResponse({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      is_new: true
    })

  } catch (err) {
    return jsonResponse({ error: err.message || 'Internal server error' }, 500)
  }
})

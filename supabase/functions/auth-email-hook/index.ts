import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// ─── Configuration (env-driven) ──────────────────────────────────────────
const SITE_NAME = Deno.env.get('SITE_NAME') ?? 'FREE Payment Gateways'
const ROOT_DOMAIN = Deno.env.get('ROOT_DOMAIN') ?? 'pay.example.com'
const SENDER_DOMAIN = Deno.env.get('SENDER_DOMAIN') ?? ROOT_DOMAIN
const FROM_DOMAIN = Deno.env.get('FROM_DOMAIN') ?? ROOT_DOMAIN

// ─── Standard Webhooks (Supabase Auth Hooks use this spec) ───────────────
// Header contract: webhook-id, webhook-timestamp (unix seconds),
// webhook-signature: "v1,<base64 hmac-sha256>" (whitespace-separated entries).
// Signed content: `${webhook-id}.${webhook-timestamp}.${rawBody}`
// Secret: whsec_<base64> (a leading "v1," prefix, or whsec_..., is accepted).
const MAX_SKEW_SECONDS = 300 // 5 minutes

function base64ToBytes(input: string): Uint8Array {
  const bin = atob(input)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const cleaned = secret.replace(/^v1,/, '').replace(/^whsec_/, '')
  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(cleaned),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifyAuthHook(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get('AUTH_HOOK_SECRET') ?? Deno.env.get('SUPABASE_AUTH_HOOK_SECRET')
  if (!secret) return false // fail closed: no secret configured → no email pipeline

  const id = req.headers.get('webhook-id')
  const timestamp = req.headers.get('webhook-timestamp')
  const signatureHeader = req.headers.get('webhook-signature')
  if (!id || !timestamp || !signatureHeader) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false

  const key = await hmacKey(secret)
  const signed = new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`)
  const expected = bytesToBase64(new Uint8Array(await crypto.subtle.sign('HMAC', key, signed)))

  return signatureHeader
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.startsWith('v1,'))
    .map((part) => part.slice(3))
    .some((sig) => sig.length > 0 && timingSafeEqual(expected, sig))
}

interface AuthHookPayload {
  user?: { email?: string }
  email_data?: {
    token?: string
    token_hash?: string
    redirect_to?: string
    email_action_type?: string
    new_email?: string
  }
}

const SAMPLE_PROJECT_URL = 'https://www.pay.example.com'
const SAMPLE_EMAIL = 'user@example.test'
const SAMPLE_DATA: Record<string, object> = {
  signup: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  magiclink: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  recovery: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  invite: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, confirmationUrl: SAMPLE_PROJECT_URL },
  email_change: { siteName: SITE_NAME, email: SAMPLE_EMAIL, newEmail: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  reauthentication: { token: '123456' },
}

// Preview endpoint — disabled unless EMAIL_PREVIEW_TOKEN is set.
//   curl -X POST https://<project>.functions.supabase.co/auth-email-hook/preview \
//     -H "Authorization: Bearer <EMAIL_PREVIEW_TOKEN>" -d '{"type":"signup"}'
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const previewToken = Deno.env.get('EMAIL_PREVIEW_TOKEN')
  const authHeader = req.headers.get('Authorization')
  if (!previewToken || authHeader !== `Bearer ${previewToken}`) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const html = await renderAsync(React.createElement(EmailTemplate, SAMPLE_DATA[type] ?? {}))
  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Webhook handler — verifies the Standard-Webhooks signature, enqueues the email.
// Wire it up: Supabase Dashboard → Authentication → Hooks → Send Email
//   URL: https://<project>.functions.supabase.co/auth-email-hook
//   Secret: the same value as AUTH_HOOK_SECRET (whsec_...) in Edge Function secrets.
async function handleWebhook(req: Request): Promise<Response> {
  const rawBody = await req.text()
  const run_id = req.headers.get('webhook-id') ?? `run_${Date.now()}`

  if (!(await verifyAuthHook(req, rawBody))) {
    console.error('Auth hook signature verification failed', { run_id })
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: AuthHookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const emailType = payload.email_data?.email_action_type
  if (!emailType || !EMAIL_TEMPLATES[emailType]) {
    console.error('Unknown email action type', { emailType, run_id })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const recipient = payload.user?.email
  const tokenHash = payload.email_data?.token_hash
  const redirectTo = payload.email_data?.redirect_to ?? `https://${ROOT_DOMAIN}`
  const confirmationUrl = tokenHash
    ? `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}token_hash=${tokenHash}&type=${emailType}`
    : redirectTo

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient,
    confirmationUrl,
    token: payload.email_data?.token,
    email: recipient,
    newEmail: payload.email_data?.new_email ?? recipient,
  }

  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const messageId = crypto.randomUUID()

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      run_id,
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: EMAIL_SUBJECTS[emailType] || 'Notification',
      html,
      text,
      purpose: 'transactional',
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue auth email', { error: enqueueError, run_id, emailType })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: recipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email enqueued', { emailType, email: recipient, run_id })

  return new Response(
    JSON.stringify({ success: true, queued: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

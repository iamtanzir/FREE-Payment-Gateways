// Provider-agnostic email sender used by the email pipeline.
//
// Configure exactly one provider via secrets:
//   RESEND_API_KEY     — https://resend.com (free tier available). Simplest option.
//   EMAIL_WEBHOOK_URL  — any HTTPS endpoint accepting {to, from, subject, html, text, idempotency_key}
//                        (e.g. your own SMTP bridge, Mailgun proxy, etc.)
//
// The caller (process-email-queue) relies on `.status` being set on thrown errors
// to implement rate-limit handling.
export class EmailAPIError extends Error {
  status: number
  retryAfterSeconds: number | null

  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message)
    this.name = 'EmailAPIError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export interface SendEmailInput {
  to: string
  from: string
  senderDomain?: string
  subject: string
  html: string
  text?: string
  purpose?: string
  label?: string
  idempotencyKey?: string
  unsubscribeToken?: string | null
  messageId?: string | null
  runId?: string
}

async function sendViaResend(input: SendEmailInput, apiKey: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    }),
  })

  if (!res.ok) {
    let message = `Resend error ${res.status}`
    try {
      const body = await res.json()
      if (typeof body?.message === 'string') message = body.message
    } catch { /* keep generic message */ }
    const retryAfter = res.headers.get('retry-after')
    throw new EmailAPIError(message, res.status, retryAfter ? Number(retryAfter) || 60 : null)
  }
}

async function sendViaWebhook(input: SendEmailInput, url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: input.to,
      from: input.from,
      sender_domain: input.senderDomain,
      subject: input.subject,
      html: input.html,
      text: input.text ?? null,
      purpose: input.purpose ?? null,
      label: input.label ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      unsubscribe_token: input.unsubscribeToken ?? null,
      message_id: input.messageId ?? null,
      run_id: input.runId ?? null,
    }),
  })

  if (!res.ok) {
    let message = `Email webhook error ${res.status}`
    try {
      const body = await res.text()
      if (body) message = body.slice(0, 300)
    } catch { /* ignore */ }
    const retryAfter = res.headers.get('retry-after')
    throw new EmailAPIError(message, res.status, retryAfter ? Number(retryAfter) || 60 : null)
  }
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const webhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL')

  if (resendKey) return sendViaResend(input, resendKey)
  if (webhookUrl) return sendViaWebhook(input, webhookUrl)

  throw new EmailAPIError(
    'No email provider configured (set RESEND_API_KEY or EMAIL_WEBHOOK_URL)',
    500,
  )
}

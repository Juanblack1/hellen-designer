import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  compactPhone,
  getAsaasApiBaseUrl,
  getAsaasCheckoutHost,
  getBearerToken,
  getRequiredEnv,
  getSiteUrl,
  getSupabaseAdmin,
  readJsonBody,
  sendJson,
  truncateText,
} from '../server/payments'

type BookingRow = {
  id: string
  user_id: string
  client_name: string
  client_email: string
  client_phone: string
  service_id: string
  service_name: string
  preferred_date: string
  preferred_time: string
  preferred_end_time: string
  status: string
}

type BookingPolicyRow = {
  auto_confirm_enabled: boolean
  deposit_required: boolean
  deposit_amount_cents: number
  deposit_checkout_expiration_minutes: number
}

type PaymentRow = {
  id: string
  checkout_url: string | null
  expires_at: string
  status: string
}

type AsaasCheckoutResponse = {
  id?: string
  link?: string
}

const transparentPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getBookingId(payload: unknown) {
  if (!isRecord(payload) || typeof payload.bookingId !== 'string') {
    return ''
  }

  return payload.bookingId
}

function formatDateForDescription(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'method_not_allowed' })
    return
  }

  try {
    const accessToken = getBearerToken(request)

    if (!accessToken) {
      sendJson(response, 401, { error: 'auth_required' })
      return
    }

    const payload = await readJsonBody(request)
    const bookingId = getBookingId(payload)

    if (!bookingId) {
      sendJson(response, 400, { error: 'booking_required' })
      return
    }

    const supabase = getSupabaseAdmin()
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)

    if (userError || !userData.user) {
      sendJson(response, 401, { error: 'auth_invalid' })
      return
    }

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('id,user_id,client_name,client_email,client_phone,service_id,service_name,preferred_date,preferred_time,preferred_end_time,status')
      .eq('id', bookingId)
      .single()

    const booking = bookingData as BookingRow | null

    if (bookingError || !booking || booking.user_id !== userData.user.id) {
      sendJson(response, 404, { error: 'booking_not_found' })
      return
    }

    if (booking.status !== 'awaiting_deposit') {
      sendJson(response, 409, { error: 'booking_not_waiting_payment' })
      return
    }

    const { data: policyData, error: policyError } = await supabase
      .from('booking_policies')
      .select('auto_confirm_enabled,deposit_required,deposit_amount_cents,deposit_checkout_expiration_minutes')
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const policy = policyData as BookingPolicyRow | null

    if (policyError || !policy?.deposit_required || policy.deposit_amount_cents <= 0) {
      sendJson(response, 409, { error: 'deposit_not_enabled' })
      return
    }

    const { data: existingPayments } = await supabase
      .from('booking_payments')
      .select('id,checkout_url,expires_at,status')
      .eq('booking_id', booking.id)
      .eq('provider', 'asaas')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    const existingPayment = (existingPayments as PaymentRow[] | null)?.[0]

    if (
      existingPayment?.checkout_url &&
      existingPayment.status === 'pending' &&
      new Date(existingPayment.expires_at).getTime() > Date.now()
    ) {
      sendJson(response, 200, { checkoutUrl: existingPayment.checkout_url })
      return
    }

    const minutesToExpire = policy.deposit_checkout_expiration_minutes
    const expiresAt = new Date(Date.now() + minutesToExpire * 60_000).toISOString()
    const { data: paymentData, error: paymentError } = await supabase
      .from('booking_payments')
      .insert({
        booking_id: booking.id,
        user_id: userData.user.id,
        provider: 'asaas',
        status: 'pending',
        amount_cents: policy.deposit_amount_cents,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    const payment = paymentData as { id: string } | null

    if (paymentError || !payment) {
      sendJson(response, 500, { error: 'payment_create_failed' })
      return
    }

    const siteUrl = getSiteUrl()
    const asaasRequest = {
      billingTypes: ['PIX', 'CREDIT_CARD'],
      chargeTypes: ['DETACHED'],
      minutesToExpire,
      externalReference: payment.id,
      callback: {
        successUrl: `${siteUrl}/cliente?payment=success&booking=${booking.id}`,
        cancelUrl: `${siteUrl}/cliente?payment=cancel&booking=${booking.id}`,
        expiredUrl: `${siteUrl}/cliente?payment=expired&booking=${booking.id}`,
      },
      items: [
        {
          externalReference: booking.id,
          name: 'Sinal de reserva',
          description: truncateText(
            `${booking.service_name} em ${formatDateForDescription(booking.preferred_date)} das ${booking.preferred_time.slice(0, 5)} ate ${booking.preferred_end_time.slice(0, 5)}`,
            150,
          ),
          imageBase64: transparentPngBase64,
          quantity: 1,
          value: policy.deposit_amount_cents / 100,
        },
      ],
      customerData: {
        name: booking.client_name,
        email: booking.client_email,
        phone: compactPhone(booking.client_phone),
      },
    }

    const asaasResponse = await fetch(`${getAsaasApiBaseUrl()}/v3/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HellenBrows/1.0.0',
        access_token: getRequiredEnv('ASAAS_API_KEY'),
      },
      body: JSON.stringify(asaasRequest),
    })
    const asaasPayload = (await asaasResponse.json().catch(() => ({}))) as AsaasCheckoutResponse

    if (!asaasResponse.ok || !asaasPayload.id) {
      await supabase
        .from('booking_payments')
        .update({ status: 'failed', raw_event: asaasPayload, updated_at: new Date().toISOString() })
        .eq('id', payment.id)

      sendJson(response, 502, { error: 'checkout_create_failed' })
      return
    }

    const checkoutUrl = asaasPayload.link ?? `${getAsaasCheckoutHost()}/checkoutSession/show?id=${asaasPayload.id}`
    const { error: checkoutUpdateError } = await supabase
      .from('booking_payments')
      .update({
        provider_checkout_id: asaasPayload.id,
        checkout_url: checkoutUrl,
        raw_event: asaasPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    if (checkoutUpdateError) {
      sendJson(response, 500, { error: 'checkout_save_failed' })
      return
    }

    sendJson(response, 200, { checkoutUrl })
  } catch {
    sendJson(response, 500, { error: 'unexpected_error' })
  }
}

export default handler

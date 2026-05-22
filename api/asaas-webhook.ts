/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'http'
import {
  fetchJsonWithTimeout,
  getAsaasApiBaseUrl,
  getRequiredEnv,
  getSupabaseAdmin,
  isHttpRequestError,
  isUuid,
  readJsonBody,
  redactSensitivePayload,
  sendJson,
  timingSafeEqualString,
} from '../server/payments.js'

type AsaasCheckout = {
  id?: string
  status?: string
  externalReference?: string
}

type AsaasWebhookPayload = {
  id?: string
  event?: string
  checkout?: AsaasCheckout
  payment?: {
    id?: string
  }
}

type PaymentRow = {
  id: string
  booking_id: string
  status: string
  amount_cents: number
}

type BookingPolicyRow = {
  auto_confirm_enabled: boolean
}

type WebhookEventRow = {
  processed_at: string | null
}

type AsaasValidationResponse = {
  id?: string
  status?: string
  value?: number
  amount?: number
  totalValue?: number
  externalReference?: string
  checkout?: {
    id?: string
    externalReference?: string
  }
}

const paidAsaasStatuses = new Set(['PAID', 'RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readWebhookPayload(payload: unknown): AsaasWebhookPayload {
  if (!isRecord(payload)) {
    return {}
  }

  const checkout = isRecord(payload.checkout) ? payload.checkout : undefined
  const payment = isRecord(payload.payment) ? payload.payment : undefined

  return {
    id: typeof payload.id === 'string' ? payload.id : undefined,
    event: typeof payload.event === 'string' ? payload.event : undefined,
    checkout: checkout
      ? {
          id: typeof checkout.id === 'string' ? checkout.id : undefined,
          status: typeof checkout.status === 'string' ? checkout.status : undefined,
          externalReference: typeof checkout.externalReference === 'string' ? checkout.externalReference : undefined,
        }
      : undefined,
    payment: payment
      ? {
          id: typeof payment.id === 'string' ? payment.id : undefined,
        }
      : undefined,
  }
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizePaymentStatus(eventType: string, checkoutStatus: string) {
  if (eventType === 'CHECKOUT_PAID' || checkoutStatus === 'PAID') {
    return 'paid'
  }

  if (eventType === 'CHECKOUT_EXPIRED' || checkoutStatus === 'EXPIRED') {
    return 'expired'
  }

  if (eventType === 'CHECKOUT_CANCELED' || checkoutStatus === 'CANCELED') {
    return 'canceled'
  }

  return 'pending'
}

function currencyToCents(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  return Math.round(value * 100)
}

async function validatePaidPaymentWithAsaas(payment: PaymentRow, checkoutId: string, paymentId: string) {
  if (!checkoutId && !paymentId) {
    return { ok: false, reason: 'missing_provider_reference', payload: {} }
  }

  const resourcePath = paymentId ? `/v3/payments/${encodeURIComponent(paymentId)}` : `/v3/checkouts/${encodeURIComponent(checkoutId)}`
  const { response, payload } = await fetchJsonWithTimeout<AsaasValidationResponse>(
    `${getAsaasApiBaseUrl()}${resourcePath}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HellenBrows/1.0.0',
        access_token: getRequiredEnv('ASAAS_API_KEY'),
      },
    },
  )

  if (!response.ok) {
    throw new Error('asaas_validation_request_failed')
  }

  const remoteStatus = payload.status?.toUpperCase() ?? ''
  const externalReference = payload.externalReference ?? payload.checkout?.externalReference ?? ''
  const remoteAmountCents = currencyToCents(payload.value ?? payload.amount ?? payload.totalValue)

  if (!paidAsaasStatuses.has(remoteStatus)) {
    return { ok: false, reason: 'provider_status_not_paid', payload }
  }

  if (externalReference && externalReference !== payment.id) {
    return { ok: false, reason: 'external_reference_mismatch', payload }
  }

  if (remoteAmountCents !== null && remoteAmountCents !== payment.amount_cents) {
    return { ok: false, reason: 'amount_mismatch', payload }
  }

  if (paymentId && payload.id && payload.id !== paymentId) {
    return { ok: false, reason: 'payment_id_mismatch', payload }
  }

  if (!paymentId && checkoutId && payload.id && payload.id !== checkoutId) {
    return { ok: false, reason: 'checkout_id_mismatch', payload }
  }

  return { ok: true, reason: '', payload }
}

async function markEventProcessed(supabase: ReturnType<typeof getSupabaseAdmin>, eventId: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from('asaas_webhook_events')
    .update({ processed_at: new Date().toISOString(), ...patch })
    .eq('asaas_event_id', eventId)

  return error
}

async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'method_not_allowed' })
    return
  }

  let expectedToken: string

  try {
    expectedToken = getRequiredEnv('ASAAS_WEBHOOK_TOKEN')
  } catch {
    sendJson(response, 500, { error: 'webhook_not_configured' })
    return
  }

  const token = getHeaderValue(request.headers['asaas-access-token'])

  if (!token || !timingSafeEqualString(token, expectedToken)) {
    sendJson(response, 401, { error: 'invalid_webhook_token' })
    return
  }

  try {
    const payload = await readJsonBody(request)
    const webhookPayload = readWebhookPayload(payload)
    const eventId = webhookPayload.id
    const eventType = webhookPayload.event ?? 'UNKNOWN'
    const sanitizedPayload = redactSensitivePayload(payload)

    if (!eventId) {
      sendJson(response, 400, { error: 'event_id_required' })
      return
    }

    const supabase = getSupabaseAdmin()
    const { error: eventInsertError } = await supabase.from('asaas_webhook_events').insert({
      asaas_event_id: eventId,
      event_type: eventType,
      payload: sanitizedPayload,
    })

    if (eventInsertError?.code === '23505') {
      const { data: existingEvent, error: existingEventError } = await supabase
        .from('asaas_webhook_events')
        .select('processed_at')
        .eq('asaas_event_id', eventId)
        .maybeSingle()

      if (existingEventError) {
        sendJson(response, 500, { error: 'event_lookup_failed' })
        return
      }

      if ((existingEvent as WebhookEventRow | null)?.processed_at) {
        sendJson(response, 200, { received: true, duplicate: true })
        return
      }
    } else if (eventInsertError) {
      sendJson(response, 500, { error: 'event_store_failed' })
      return
    }

    const checkoutId = webhookPayload.checkout?.id ?? ''
    const externalReference = webhookPayload.checkout?.externalReference ?? ''
    let payment: PaymentRow | null = null

    if (externalReference && isUuid(externalReference)) {
      const { data, error } = await supabase
        .from('booking_payments')
        .select('id,booking_id,status,amount_cents')
        .eq('id', externalReference)
        .maybeSingle()

      if (error) {
        sendJson(response, 500, { error: 'payment_lookup_failed' })
        return
      }

      payment = data as PaymentRow | null
    }

    if (!payment && checkoutId) {
      const { data, error } = await supabase
        .from('booking_payments')
        .select('id,booking_id,status,amount_cents')
        .eq('provider', 'asaas')
        .eq('provider_checkout_id', checkoutId)
        .maybeSingle()

      if (error) {
        sendJson(response, 500, { error: 'payment_lookup_failed' })
        return
      }

      payment = data as PaymentRow | null
    }

    if (!payment) {
      const eventError = await markEventProcessed(supabase, eventId, { processing_error: 'payment_not_found' })

      if (eventError) {
        sendJson(response, 500, { error: 'event_process_mark_failed' })
        return
      }

      sendJson(response, 200, { received: true, ignored: 'payment_not_found' })
      return
    }

    const paymentStatus = normalizePaymentStatus(eventType, webhookPayload.checkout?.status ?? '')
    const now = new Date().toISOString()
    let rawEvent: unknown = sanitizedPayload

    if (paymentStatus === 'paid') {
      let validation

      try {
        validation = await validatePaidPaymentWithAsaas(payment, checkoutId, webhookPayload.payment?.id ?? '')
      } catch (error) {
        if (isHttpRequestError(error)) {
          sendJson(response, error.statusCode, { error: error.code })
          return
        }

        sendJson(response, 502, { error: 'asaas_validation_failed' })
        return
      }

      rawEvent = {
        webhook: sanitizedPayload,
        validation: redactSensitivePayload(validation.payload),
      }

      if (!validation.ok) {
        const { error: paymentUpdateError } = await supabase
          .from('booking_payments')
          .update({ raw_event: rawEvent, updated_at: now })
          .eq('id', payment.id)

        if (paymentUpdateError) {
          sendJson(response, 500, { error: 'payment_validation_store_failed' })
          return
        }

        const eventError = await markEventProcessed(supabase, eventId, {
          processing_error: `payment_validation_failed:${validation.reason}`,
        })

        if (eventError) {
          sendJson(response, 500, { error: 'event_process_mark_failed' })
          return
        }

        sendJson(response, 202, { received: true, ignored: validation.reason })
        return
      }
    }

    const nextPaymentStatus = payment.status === 'paid' && paymentStatus !== 'paid' ? 'paid' : paymentStatus
    const paymentUpdate: Record<string, unknown> = {
      provider_payment_id: webhookPayload.payment?.id ?? null,
      status: nextPaymentStatus,
      raw_event: rawEvent,
      updated_at: now,
    }

    if (checkoutId) {
      paymentUpdate.provider_checkout_id = checkoutId
    }

    if (paymentStatus === 'paid') {
      paymentUpdate.paid_at = now
    }

    const { error: paymentUpdateError } = await supabase
      .from('booking_payments')
      .update(paymentUpdate)
      .eq('id', payment.id)

    if (paymentUpdateError) {
      sendJson(response, 500, { error: 'payment_update_failed' })
      return
    }

    if (paymentStatus === 'paid') {
      const { data: policyData, error: policyError } = await supabase
        .from('booking_policies')
        .select('auto_confirm_enabled')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (policyError) {
        sendJson(response, 500, { error: 'policy_lookup_failed' })
        return
      }

      const policy = policyData as BookingPolicyRow | null
      const nextStatus = policy?.auto_confirm_enabled ? 'confirmed' : 'pending'
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: nextStatus,
          confirmed_at: nextStatus === 'confirmed' ? now : null,
          updated_at: now,
        })
        .eq('id', payment.booking_id)
        .eq('status', 'awaiting_deposit')

      if (bookingUpdateError) {
        sendJson(response, 500, { error: 'booking_payment_status_update_failed' })
        return
      }
    }

    if (payment.status !== 'paid' && (paymentStatus === 'expired' || paymentStatus === 'canceled')) {
      const { error: bookingExpireError } = await supabase
        .from('bookings')
        .update({
          status: 'deposit_expired',
          canceled_at: now,
          cancellation_reason: 'Sinal nao pago no prazo.',
          updated_at: now,
        })
        .eq('id', payment.booking_id)
        .eq('status', 'awaiting_deposit')

      if (bookingExpireError) {
        sendJson(response, 500, { error: 'booking_deposit_expire_failed' })
        return
      }
    }

    const eventError = await markEventProcessed(supabase, eventId, { processing_error: null })

    if (eventError) {
      sendJson(response, 500, { error: 'event_process_mark_failed' })
      return
    }

    sendJson(response, 200, { received: true })
  } catch (error) {
    if (isHttpRequestError(error)) {
      sendJson(response, error.statusCode, { error: error.code })
      return
    }

    sendJson(response, 500, { error: 'unexpected_error' })
  }
}

export default handler

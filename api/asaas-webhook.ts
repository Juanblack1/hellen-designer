/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'http'
import { getRequiredEnv, getSupabaseAdmin, isUuid, readJsonBody, sendJson } from '../server/payments.js'

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
}

type BookingPolicyRow = {
  auto_confirm_enabled: boolean
}

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

  if (!token || token !== expectedToken) {
    sendJson(response, 401, { error: 'invalid_webhook_token' })
    return
  }

  try {
    const payload = await readJsonBody(request)
    const webhookPayload = readWebhookPayload(payload)
    const eventId = webhookPayload.id
    const eventType = webhookPayload.event ?? 'UNKNOWN'

    if (!eventId) {
      sendJson(response, 400, { error: 'event_id_required' })
      return
    }

    const supabase = getSupabaseAdmin()
    const { error: eventInsertError } = await supabase.from('asaas_webhook_events').insert({
      asaas_event_id: eventId,
      event_type: eventType,
      payload,
    })

    if (eventInsertError?.code === '23505') {
      sendJson(response, 200, { received: true })
      return
    }

    if (eventInsertError) {
      sendJson(response, 500, { error: 'event_store_failed' })
      return
    }

    const checkoutId = webhookPayload.checkout?.id ?? ''
    const externalReference = webhookPayload.checkout?.externalReference ?? ''
    let payment: PaymentRow | null = null

    if (externalReference && isUuid(externalReference)) {
      const { data } = await supabase
        .from('booking_payments')
        .select('id,booking_id,status')
        .eq('id', externalReference)
        .maybeSingle()
      payment = data as PaymentRow | null
    }

    if (!payment && checkoutId) {
      const { data } = await supabase
        .from('booking_payments')
        .select('id,booking_id,status')
        .eq('provider', 'asaas')
        .eq('provider_checkout_id', checkoutId)
        .maybeSingle()
      payment = data as PaymentRow | null
    }

    if (!payment) {
      await supabase
        .from('asaas_webhook_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('asaas_event_id', eventId)
      sendJson(response, 200, { received: true })
      return
    }

    const paymentStatus = normalizePaymentStatus(eventType, webhookPayload.checkout?.status ?? '')
    const now = new Date().toISOString()

    await supabase
      .from('booking_payments')
      .update({
        provider_checkout_id: checkoutId || undefined,
        provider_payment_id: webhookPayload.payment?.id,
        status: paymentStatus,
        paid_at: paymentStatus === 'paid' ? now : undefined,
        raw_event: payload,
        updated_at: now,
      })
      .eq('id', payment.id)

    if (paymentStatus === 'paid') {
      const { data: policyData } = await supabase
        .from('booking_policies')
        .select('auto_confirm_enabled')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      const policy = policyData as BookingPolicyRow | null
      const nextStatus = policy?.auto_confirm_enabled ? 'confirmed' : 'pending'

      await supabase
        .from('bookings')
        .update({
          status: nextStatus,
          confirmed_at: nextStatus === 'confirmed' ? now : null,
          updated_at: now,
        })
        .eq('id', payment.booking_id)
        .eq('status', 'awaiting_deposit')
    }

    if (paymentStatus === 'expired' || paymentStatus === 'canceled') {
      await supabase
        .from('bookings')
        .update({
          status: 'deposit_expired',
          canceled_at: now,
          cancellation_reason: 'Sinal nao pago no prazo.',
          updated_at: now,
        })
        .eq('id', payment.booking_id)
        .eq('status', 'awaiting_deposit')
    }

    await supabase
      .from('asaas_webhook_events')
      .update({ processed_at: now })
      .eq('asaas_event_id', eventId)

    sendJson(response, 200, { received: true })
  } catch {
    sendJson(response, 500, { error: 'unexpected_error' })
  }
}

export default handler

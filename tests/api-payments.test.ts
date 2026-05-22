import type { IncomingMessage, ServerResponse } from 'http'
import { Readable } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = {
  data?: unknown
  error?: { code?: string; message?: string } | null
}

type Operation = {
  table: string
  type: 'insert' | 'update'
  payload: unknown
}

let supabaseMock: ReturnType<typeof createSupabaseMock>

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseMock),
}))

function createRequest(body: unknown, headers: Record<string, string> = {}) {
  return Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  }) as IncomingMessage
}

function createResponse() {
  let body = ''
  const response = {
    statusCode: 200,
    setHeader: vi.fn(),
    end: vi.fn((payload?: string) => {
      body = payload ?? ''
    }),
  } as unknown as ServerResponse

  return { response, get body() { return body } }
}

function createSupabaseMock(plans: Record<string, QueryResult[]>) {
  const operations: Operation[] = []
  const next = (key: string): QueryResult => plans[key]?.shift() ?? { data: null, error: null }

  function createBuilder(table: string) {
    let result: QueryResult = { data: null, error: null }
    let mode: 'insert' | 'select' | 'update' | null = null
    const builder = {
      select() {
        if (!mode) {
          mode = 'select'
          result = next(`${table}.select`)
        }

        return builder
      },
      insert(payload: unknown) {
        mode = 'insert'
        operations.push({ table, type: 'insert', payload })
        result = next(`${table}.insert`)
        return builder
      },
      update(payload: unknown) {
        mode = 'update'
        operations.push({ table, type: 'update', payload })
        result = next(`${table}.update`)
        return builder
      },
      eq() {
        return builder
      },
      order() {
        return builder
      },
      limit() {
        return builder
      },
      single() {
        return Promise.resolve(result)
      },
      maybeSingle() {
        return Promise.resolve(result)
      },
      then<TResult1 = QueryResult, TResult2 = never>(
        onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(result).then(onfulfilled, onrejected)
      },
    }

    return builder
  }

  return {
    operations,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn((table: string) => createBuilder(table)),
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  process.env.PUBLIC_SITE_URL = 'https://hellen-brows.vercel.app'
  process.env.ASAAS_API_BASE_URL = 'https://api-sandbox.asaas.com'
  process.env.ASAAS_API_KEY = 'asaas-key'
  process.env.ASAAS_WEBHOOK_TOKEN = 'webhook-token'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('deposit checkout API', () => {
  it('returns an active pending checkout instead of creating a duplicate', async () => {
    supabaseMock = createSupabaseMock({
      'bookings.select': [{
        data: {
          id: 'booking-1',
          user_id: 'user-1',
          client_name: 'Cliente',
          client_email: 'cliente@example.com',
          client_phone: '11999999999',
          service_id: 'design',
          service_name: 'Design',
          preferred_date: '2026-06-01',
          preferred_time: '10:00',
          preferred_end_time: '10:40',
          status: 'awaiting_deposit',
        },
        error: null,
      }],
      'booking_policies.select': [{
        data: {
          auto_confirm_enabled: false,
          deposit_required: true,
          deposit_amount_cents: 2000,
          deposit_checkout_expiration_minutes: 30,
        },
        error: null,
      }],
      'booking_payments.select': [{
        data: [{
          id: 'payment-1',
          checkout_url: 'https://sandbox.asaas.com/checkout/active',
          expires_at: new Date(Date.now() + 30_000).toISOString(),
          status: 'pending',
        }],
        error: null,
      }],
    })
    vi.stubGlobal('fetch', vi.fn())
    const { default: handler } = await import('../api/create-deposit-checkout')
    const result = createResponse()

    await handler(createRequest({ bookingId: 'booking-1' }, { authorization: 'Bearer token' }), result.response)

    expect(result.response.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({ checkoutUrl: 'https://sandbox.asaas.com/checkout/active' })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

describe('Asaas webhook API', () => {
  it('ignores already processed duplicate webhook events', async () => {
    supabaseMock = createSupabaseMock({
      'asaas_webhook_events.insert': [{ error: { code: '23505', message: 'duplicate' } }],
      'asaas_webhook_events.select': [{ data: { processed_at: '2026-05-21T10:00:00.000Z' }, error: null }],
    })
    const { default: handler } = await import('../api/asaas-webhook')
    const result = createResponse()

    await handler(
      createRequest({ id: 'evt-1', event: 'CHECKOUT_PAID' }, { 'asaas-access-token': 'webhook-token' }),
      result.response,
    )

    expect(result.response.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({ received: true, duplicate: true })
    expect(supabaseMock.operations.filter((operation) => operation.type === 'update')).toHaveLength(0)
  })

  it('validates paid events with Asaas before confirming the booking', async () => {
    const paymentId = '11111111-1111-4111-8111-111111111111'
    supabaseMock = createSupabaseMock({
      'asaas_webhook_events.insert': [{ error: null }],
      'booking_payments.select': [{
        data: { id: paymentId, booking_id: 'booking-1', status: 'pending', amount_cents: 2000 },
        error: null,
      }],
      'booking_payments.update': [{ error: null }],
      'booking_policies.select': [{ data: { auto_confirm_enabled: false }, error: null }],
      'bookings.update': [{ error: null }],
      'asaas_webhook_events.update': [{ error: null }],
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'asaas-payment-1',
      status: 'RECEIVED',
      value: 20,
      externalReference: paymentId,
    }), { status: 200 })))
    const { default: handler } = await import('../api/asaas-webhook')
    const result = createResponse()

    await handler(
      createRequest({
        id: 'evt-2',
        event: 'CHECKOUT_PAID',
        checkout: { id: 'checkout-1', status: 'PAID', externalReference: paymentId },
        payment: { id: 'asaas-payment-1' },
      }, { 'asaas-access-token': 'webhook-token' }),
      result.response,
    )

    const bookingUpdate = supabaseMock.operations.find(
      (operation) => operation.table === 'bookings' && operation.type === 'update',
    )
    const paymentUpdate = supabaseMock.operations.find(
      (operation) => operation.table === 'booking_payments' && operation.type === 'update',
    )

    expect(result.response.statusCode).toBe(200)
    expect(paymentUpdate?.payload).toMatchObject({ status: 'paid' })
    expect(bookingUpdate?.payload).toMatchObject({ status: 'pending' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api-sandbox.asaas.com/v3/payments/asaas-payment-1',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

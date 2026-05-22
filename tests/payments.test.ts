import type { IncomingMessage, ServerResponse } from 'http'
import { Readable } from 'stream'
import { describe, expect, it, vi } from 'vitest'
import { HttpRequestError, readJsonBody, sendJson, timingSafeEqualString } from '../server/payments'

function createRequest(body: string, headers: Record<string, string> = { 'content-type': 'application/json' }) {
  return Object.assign(Readable.from(body ? [body] : []), { headers }) as IncomingMessage
}

function createResponse() {
  const headers: Record<string, string | number | readonly string[]> = {}
  let body = ''
  const response = {
    statusCode: 200,
    setHeader: vi.fn((key: string, value: string | number | readonly string[]) => {
      headers[key.toLowerCase()] = value
    }),
    end: vi.fn((payload?: string) => {
      body = payload ?? ''
    }),
  } as unknown as ServerResponse

  return { response, headers, get body() { return body } }
}

describe('payment server helpers', () => {
  it('parses JSON request bodies', async () => {
    await expect(readJsonBody(createRequest('{"bookingId":"booking-1"}'))).resolves.toEqual({
      bookingId: 'booking-1',
    })
  })

  it('rejects invalid JSON with a 400 request error', async () => {
    await expect(readJsonBody(createRequest('{')))
      .rejects.toMatchObject(new HttpRequestError(400, 'invalid_json'))
  })

  it('rejects oversized JSON bodies with a 413 request error', async () => {
    await expect(readJsonBody(createRequest('{"value":"abcdef"}'), 8))
      .rejects.toMatchObject(new HttpRequestError(413, 'payload_too_large'))
  })

  it('marks JSON responses as no-store', () => {
    const result = createResponse()

    sendJson(result.response, 200, { ok: true })

    expect(result.response.statusCode).toBe(200)
    expect(result.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(result.headers['cache-control']).toBe('no-store')
    expect(result.body).toBe('{"ok":true}')
  })

  it('compares shared secrets without exposing direct string equality', () => {
    expect(timingSafeEqualString('same-token', 'same-token')).toBe(true)
    expect(timingSafeEqualString('same-token', 'other-token')).toBe(false)
  })
})

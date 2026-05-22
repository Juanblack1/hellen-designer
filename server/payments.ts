/// <reference types="node" />

import { createClient } from '@supabase/supabase-js'
import { createHash, timingSafeEqual } from 'crypto'
import type { IncomingMessage, ServerResponse } from 'http'

type JsonResponse = Record<string, unknown>

const defaultJsonBodyLimitBytes = 64 * 1024

export class HttpRequestError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(statusCode: number, code: string) {
    super(code)
    this.statusCode = statusCode
    this.code = code
  }
}

export function isHttpRequestError(error: unknown): error is HttpRequestError {
  return error instanceof HttpRequestError
}

export function sendJson(response: ServerResponse, statusCode: number, payload: JsonResponse) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export async function readJsonBody(request: IncomingMessage, maxBytes = defaultJsonBodyLimitBytes) {
  const contentType = getHeaderValue(request.headers['content-type'])

  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new HttpRequestError(415, 'json_content_type_required')
  }

  const chunks: Buffer[] = []
  let totalBytes = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalBytes += buffer.length

    if (totalBytes > maxBytes) {
      throw new HttpRequestError(413, 'payload_too_large')
    }

    chunks.push(buffer)
  }

  const body = Buffer.concat(chunks).toString('utf8').trim()

  if (!body) {
    return {}
  }

  try {
    return JSON.parse(body) as unknown
  } catch {
    throw new HttpRequestError(400, 'invalid_json')
  }
}

export function getBearerToken(request: IncomingMessage) {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return ''
  }

  return authorization.slice('Bearer '.length).trim()
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('missing_supabase_server_env')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
}

export function getSiteUrl() {
  const configuredUrl = process.env.PUBLIC_SITE_URL ?? process.env.VITE_PUBLIC_SITE_URL

  if (!configuredUrl) {
    if (isProductionRuntime()) {
      throw new Error('missing_public_site_url')
    }

    return 'https://hellen-brows.vercel.app'
  }

  return new URL(configuredUrl).origin
}

export function getAsaasApiBaseUrl() {
  const configuredUrl = process.env.ASAAS_API_BASE_URL

  if (!configuredUrl && isProductionRuntime()) {
    throw new Error('missing_asaas_api_base_url')
  }

  return (configuredUrl ?? 'https://api.asaas.com').replace(/\/$/, '')
}

export function getAsaasCheckoutHost() {
  return getAsaasApiBaseUrl().includes('sandbox') ? 'https://sandbox.asaas.com' : 'https://asaas.com'
}

export function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`missing_${name.toLowerCase()}`)
  }

  return value
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function compactPhone(value: string | null) {
  return (value ?? '').replace(/\D/g, '')
}

export function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength - 1) : value
}

export function timingSafeEqualString(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()

  return timingSafeEqual(leftHash, rightHash)
}

export async function fetchJsonWithTimeout<T>(url: string, init: RequestInit, timeoutMs = 10_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    const payload = (await response.json().catch(() => ({}))) as T

    return { response, payload }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpRequestError(504, 'external_request_timeout')
    }

    throw new HttpRequestError(502, 'external_request_failed')
  } finally {
    clearTimeout(timeout)
  }
}

export function redactSensitivePayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitivePayload(item))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const redacted: Record<string, unknown> = {}

  for (const [key, nestedValue] of Object.entries(value)) {
    if (/token|secret|password|authorization|access[_-]?token|card|cvv|document|cpf|cnpj|email|phone|mobile|address|name/i.test(key)) {
      redacted[key] = '[redacted]'
      continue
    }

    redacted[key] = redactSensitivePayload(nestedValue)
  }

  return redacted
}

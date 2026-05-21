/// <reference types="node" />

import { createClient } from '@supabase/supabase-js'
import type { IncomingMessage, ServerResponse } from 'http'

type JsonResponse = Record<string, unknown>

export function sendJson(response: ServerResponse, statusCode: number, payload: JsonResponse) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const body = Buffer.concat(chunks).toString('utf8').trim()
  return body ? JSON.parse(body) : {}
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

export function getSiteUrl() {
  const configuredUrl = process.env.PUBLIC_SITE_URL ?? process.env.VITE_PUBLIC_SITE_URL

  if (!configuredUrl) {
    return 'https://hellen-brows.vercel.app'
  }

  return new URL(configuredUrl).origin
}

export function getAsaasApiBaseUrl() {
  return (process.env.ASAAS_API_BASE_URL ?? 'https://api.asaas.com').replace(/\/$/, '')
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

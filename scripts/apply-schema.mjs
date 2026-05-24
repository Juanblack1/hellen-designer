import { readFile } from 'node:fs/promises'
import { rootCertificates } from 'node:tls'
import pg from 'pg'

const { Client } = pg
const SUPABASE_CA_CERT_URL =
  'https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt'
const connectionString = process.env.SUPABASE_DB_URL

if (!connectionString) {
  console.error('Missing SUPABASE_DB_URL. Load it from a local secret environment before running db:push.')
  process.exit(1)
}

const loadSupabaseCaCertificate = async () => {
  const response = await fetch(SUPABASE_CA_CERT_URL)

  if (!response.ok) {
    throw new Error(`Failed to download Supabase CA certificate: ${response.status}`)
  }

  return response.text()
}

const schemaUrl = new URL('../supabase/schema.sql', import.meta.url)
const sql = await readFile(schemaUrl, 'utf8')
const supabaseCaCertificate = await loadSupabaseCaCertificate()
const client = new Client({
  connectionString,
  ssl: {
    ca: [...rootCertificates, supabaseCaCertificate],
    rejectUnauthorized: true,
  },
})

try {
  await client.connect()
  await client.query(sql)
  console.log('Supabase schema applied successfully.')
} finally {
  await client.end()
}

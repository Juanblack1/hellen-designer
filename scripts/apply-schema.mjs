import { readFile } from 'node:fs/promises'
import pg from 'pg'

const { Client } = pg
const connectionString = process.env.SUPABASE_DB_URL

if (!connectionString) {
  console.error('Missing SUPABASE_DB_URL. Load it from a local secret environment before running db:push.')
  process.exit(1)
}

const schemaUrl = new URL('../supabase/schema.sql', import.meta.url)
const sql = await readFile(schemaUrl, 'utf8')
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: true },
})

try {
  await client.connect()
  await client.query(sql)
  console.log('Supabase schema applied successfully.')
} finally {
  await client.end()
}

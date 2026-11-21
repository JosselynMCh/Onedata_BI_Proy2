import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool idle client error:', err.message)
})

export async function query(text, params) {
  return pool.query(text, params)
}

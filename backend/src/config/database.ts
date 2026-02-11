import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from '../db/schema.js';

const { Pool } = pkg as any;

function shouldUsePgSsl(connectionString?: string): boolean {
  const explicit = process.env.PG_SSL ?? process.env.DATABASE_SSL;
  if (explicit) {
    return explicit === 'true' || explicit === '1';
  }

  if (connectionString) {
    try {
      const url = new URL(connectionString);
      const sslmode = url.searchParams.get('sslmode');
      const ssl = url.searchParams.get('ssl');
      if (ssl === 'true' || ssl === '1') return true;
      if (sslmode && sslmode !== 'disable' && sslmode !== 'allow') return true;
    } catch {
      // ignore parse errors
    }
  }

  return process.env.NODE_ENV === 'production';
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5_000),
  query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS || 15_000),
  ...(shouldUsePgSsl(process.env.DATABASE_URL)
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

pool.on('error', (err: any) => {
  // Prevent unhandled errors from bringing the process down and surface the root cause.
  console.error('❌ Unexpected PG pool error:', err);
});

export const db = drizzle(pool, { schema });

export async function initDatabase() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

export { pool };

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
  ...(shouldUsePgSsl(process.env.DATABASE_URL)
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
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

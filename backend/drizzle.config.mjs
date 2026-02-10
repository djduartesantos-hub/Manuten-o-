import * as dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

function shouldUseSsl(connectionString) {
  const explicit = process.env.PG_SSL ?? process.env.DATABASE_SSL;
  if (explicit) {
    return explicit === 'true' || explicit === '1';
  }

  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get('sslmode');
    const ssl = url.searchParams.get('ssl');
    if (ssl === 'true' || ssl === '1') return true;
    if (sslmode && sslmode !== 'disable' && sslmode !== 'allow') return true;
  } catch {
    // ignore
  }

  return process.env.NODE_ENV === 'production';
}

function normalizeConnectionString(connectionString) {
  if (!connectionString) return connectionString;
  try {
    const url = new URL(connectionString);

    // Ensure SSL is enabled for managed Postgres where required.
    // drizzle-kit url mode relies on the connection string; adding `ssl=true`
    // keeps the exact DB target while enabling TLS.
    if (shouldUseSsl(connectionString)) {
      if (!url.searchParams.has('ssl') && !url.searchParams.has('sslmode')) {
        url.searchParams.set('ssl', 'true');
      }
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

const schemaPath =
  process.env.NODE_ENV === 'production'
    ? './dist/db/schema.js'
    : fs.existsSync('./src/db/schema.ts')
      ? './src/db/schema.ts'
      : './dist/db/schema.js';

export default {
  driver: 'pg',
  schema: schemaPath,
  out: './drizzle',
  dbCredentials: {
    connectionString: normalizeConnectionString(
      process.env.DATABASE_URL || 'postgresql://cmms_user:cmms_password@localhost:5432/cmms_enterprise',
    ),
  },
  verbose: true,
  // In production (e.g. Render), this must be non-interactive.
  // Keep strict confirmations enabled for local/dev by default.
  strict: process.env.DRIZZLE_STRICT
    ? process.env.DRIZZLE_STRICT === 'true'
    : process.env.NODE_ENV !== 'production',
};

import * as dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

function resolveDbCredentials() {
  const fallback =
    'postgresql://cmms_user:cmms_password@localhost:5432/cmms_enterprise';
  const connectionString = process.env.DATABASE_URL || fallback;

  const explicit = process.env.PG_SSL ?? process.env.DATABASE_SSL;
  const useSsl = explicit
    ? explicit === 'true' || explicit === '1'
    : process.env.NODE_ENV === 'production';

  try {
    const url = new URL(connectionString);
    const database = url.pathname.replace(/^\//, '') || 'postgres';
    const port = url.port ? Number(url.port) : 5432;
    const user = url.username ? decodeURIComponent(url.username) : undefined;
    const password = url.password ? decodeURIComponent(url.password) : undefined;

    return {
      host: url.hostname,
      port,
      user,
      password,
      database,
      ssl: useSsl,
    };
  } catch {
    return { connectionString };
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
  dbCredentials: resolveDbCredentials(),
  verbose: true,
  // In production (e.g. Render), this must be non-interactive.
  // Keep strict confirmations enabled for local/dev by default.
  strict: process.env.DRIZZLE_STRICT
    ? process.env.DRIZZLE_STRICT === 'true'
    : process.env.NODE_ENV !== 'production',
};

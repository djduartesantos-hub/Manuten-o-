import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[preflight-db] DATABASE_URL is not set');
  process.exit(1);
}

function shouldUseSsl() {
  const explicit = process.env.PG_SSL ?? process.env.DATABASE_SSL;
  if (explicit) return explicit === 'true' || explicit === '1';
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

const strict =
  process.env.DB_PREFLIGHT_STRICT !== undefined
    ? process.env.DB_PREFLIGHT_STRICT === 'true' || process.env.DB_PREFLIGHT_STRICT === '1'
    : process.env.NODE_ENV === 'production';

const ssl = shouldUseSsl() ? { rejectUnauthorized: false } : undefined;
const client = new Client({ connectionString, ...(ssl ? { ssl } : {}) });

async function ensureExtension(name) {
  await client.query(`CREATE EXTENSION IF NOT EXISTS ${name};`);
  console.log(`[preflight-db] ensured extension ${name}`);
}

try {
  await client.connect();
  await ensureExtension('pgcrypto');
  process.exit(0);
} catch (error) {
  console.error('[preflight-db] failed:', error);
  console.error(
    '[preflight-db] If this is a permissions issue, ensure your managed Postgres allows CREATE EXTENSION (pgcrypto).',
  );

  if (strict) {
    process.exit(1);
  }

  console.warn('[preflight-db] continuing because DB_PREFLIGHT_STRICT is disabled');
  process.exit(0);
} finally {
  try {
    await client.end();
  } catch {
    // ignore
  }
}

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

const ssl = shouldUseSsl() ? { rejectUnauthorized: false } : undefined;

const client = new Client({ connectionString, ...(ssl ? { ssl } : {}) });

async function ensureExtension(name) {
  // name is trusted constant
  const existing = await client.query(
    `SELECT 1 FROM pg_extension WHERE extname = $1 LIMIT 1;`,
    [name],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    console.log(`[preflight-db] extension already present: ${name}`);
    return;
  }

  // Some managed Postgres providers restrict CREATE EXTENSION.
  // Only attempt it when the extension is missing.
  await client.query(`CREATE EXTENSION IF NOT EXISTS ${name};`);
  console.log(`[preflight-db] ensured extension ${name}`);
}

try {
  await client.connect();
  // pgcrypto provides gen_random_uuid()
  await ensureExtension('pgcrypto');
  process.exit(0);
} catch (error) {
  console.error('[preflight-db] failed:', error);
  console.error(
    '[preflight-db] If this is a permissions issue, ensure your managed Postgres allows CREATE EXTENSION (pgcrypto).',
  );
  process.exit(1);
} finally {
  try {
    await client.end();
  } catch {
    // ignore
  }
}

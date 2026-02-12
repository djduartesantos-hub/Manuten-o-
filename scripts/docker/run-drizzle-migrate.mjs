import { spawn } from 'node:child_process';
import pg from 'pg';

const { Client } = pg;

let stdoutTail = '';
let stderrTail = '';
const MAX_TAIL_CHARS = 16 * 1024;

function appendTail(current, chunk) {
  const next = current + chunk;
  return next.length > MAX_TAIL_CHARS ? next.slice(next.length - MAX_TAIL_CHARS) : next;
}

function redactDatabaseUrl(urlString) {
  if (!urlString) return urlString;
  try {
    const url = new URL(urlString);
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return '[unparseable DATABASE_URL]';
  }
}

function shouldUseSsl(connectionString) {
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

async function hasUsersTable() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[drizzle-migrate] DATABASE_URL is not set; cannot check existing schema');
    process.exit(1);
  }

  const ssl = shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined;
  const client = new Client({ connectionString, ...(ssl ? { ssl } : {}) });

  try {
    await client.connect();
    const existsRes = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_name = 'users'
           AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ) AS exists;`,
    );
    return existsRes.rows?.[0]?.exists === true;
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

async function verifyUsersTable() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[drizzle-migrate] DATABASE_URL is not set; cannot verify schema');
    process.exit(1);
  }

  const ssl = shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined;
  const client = new Client({ connectionString, ...(ssl ? { ssl } : {}) });

  try {
    await client.connect();

    const meta = await client.query(
      `SELECT current_database() AS db, current_user AS usr, current_schema() AS schema, inet_server_addr()::text AS server_addr;`,
    );

    const existsRes = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_name = 'users'
           AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ) AS exists;`,
    );

    const exists = existsRes.rows?.[0]?.exists === true;
    if (!exists) {
      const combined = `${stdoutTail}\n${stderrTail}`.trim();
      if (combined) {
        console.error('[drizzle-migrate] db:push output tail (truncated):');
        console.error(combined);
      }

      console.error('[drizzle-migrate] Schema verification failed: users table still missing');
      console.error('[drizzle-migrate] Connected meta:', meta.rows?.[0]);
      console.error('[drizzle-migrate] DATABASE_URL:', redactDatabaseUrl(connectionString));

      const sample = await client.query(
        `SELECT table_schema, table_name
         FROM information_schema.tables
         WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
         ORDER BY table_schema, table_name
         LIMIT 50;`,
      );
      console.error('[drizzle-migrate] Sample tables (first 50):', sample.rows);
      process.exit(1);
    }

    console.log('[drizzle-migrate] verified: users table exists');
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

const env = { ...process.env };

// Railway Postgres can present a self-signed cert chain.
// Limit the TLS bypass to the migration subprocess only.
const configured = env.PG_TLS_REJECT_UNAUTHORIZED ?? env.NODE_TLS_REJECT_UNAUTHORIZED;
if (configured === undefined && env.NODE_ENV === 'production') {
  env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const verbose = env.DRIZZLE_MIGRATE_VERBOSE === 'true' || env.DRIZZLE_MIGRATE_VERBOSE === '1';
const autoApprove =
  env.DRIZZLE_AUTO_APPROVE !== undefined
    ? env.DRIZZLE_AUTO_APPROVE === 'true' || env.DRIZZLE_AUTO_APPROVE === '1'
    : env.NODE_ENV === 'production';

const pushMode = (env.DRIZZLE_PUSH_MODE ?? 'auto').toLowerCase();
// auto: run push only if users table is missing (fresh DB)
// never: skip push entirely
// always: always run push (may require interactive confirmation on data loss)

if (pushMode === 'never') {
  console.log('[drizzle-migrate] DRIZZLE_PUSH_MODE=never; skipping db:push');
  process.exit(0);
}

if (pushMode === 'auto') {
  const exists = await hasUsersTable();
  if (exists) {
    console.log('[drizzle-migrate] existing DB detected (users table present); skipping db:push');
    process.exit(0);
  }
}

const pushTimeoutMs = Number(env.DRIZZLE_PUSH_TIMEOUT_MS ?? 180000);

function maybeAutoApproveFromOutput(chunkText) {
  if (!autoApprove) return;
  const text = String(chunkText);
  // Common drizzle-kit prompt variants
  if (
    /do you want to/i.test(text) ||
    /are you sure/i.test(text) ||
    /proceed\?/i.test(text) ||
    /apply/i.test(text) && /changes/i.test(text)
  ) {
    try {
      child.stdin?.write('y\n');
    } catch {
      // ignore
    }
  }
}

console.log(`[drizzle-migrate] running db:push${verbose ? ' (verbose)' : ''}...`);

const child = spawn('npm', ['run', 'db:push'], {
  // Keep stdin available so drizzle-kit can prompt if it needs to.
  // We still capture stdout/stderr to avoid log-rate limits.
  stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe'],
  env,
});

const timeout = Number.isFinite(pushTimeoutMs) && pushTimeoutMs > 0
  ? setTimeout(() => {
      if (!verbose) {
        const combined = `${stdoutTail}\n${stderrTail}`.trim();
        if (combined) {
          console.error('[drizzle-migrate] db:push timed out; last output chunk (truncated):');
          console.error(combined);
        }
      }
      console.error(`[drizzle-migrate] db:push timed out after ${pushTimeoutMs}ms`);
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, 5000).unref();
    }, pushTimeoutMs)
  : null;

if (!verbose && autoApprove) {
  // drizzle-kit may ask for confirmation before executing statements.
  // We keep stdin open and send approval eagerly + when prompts appear.
  try {
    child.stdin?.write('y\n');
  } catch {
    // ignore
  }
}

if (!verbose) {
  child.stdout?.on('data', (d) => {
    const text = d.toString('utf8');
    stdoutTail = appendTail(stdoutTail, text);
    maybeAutoApproveFromOutput(text);
  });
  child.stderr?.on('data', (d) => {
    const text = d.toString('utf8');
    stderrTail = appendTail(stderrTail, text);
    maybeAutoApproveFromOutput(text);
  });
}

child.on('error', (error) => {
  if (timeout) timeout.unref?.();
  console.error('[drizzle-migrate] failed to spawn db:push:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (timeout) clearTimeout(timeout);
  try {
    child.stdin?.end();
  } catch {
    // ignore
  }
  if (typeof code === 'number') {
    if (code !== 0) {
      if (!verbose) {
        const combined = `${stdoutTail}\n${stderrTail}`.trim();
        if (combined) {
          console.error('[drizzle-migrate] db:push failed; last output chunk (truncated):');
          console.error(combined);
        }
      }
      process.exit(code);
    }

    console.log('[drizzle-migrate] db:push OK');
    verifyUsersTable().catch((error) => {
      console.error('[drizzle-migrate] verification error:', error);
      process.exit(1);
    });
    return;
  }
  console.error(`[drizzle-migrate] exited via signal ${signal}`);
  process.exit(1);
});

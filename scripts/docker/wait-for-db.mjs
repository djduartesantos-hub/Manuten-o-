import pg from 'pg';

const { Client } = pg;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[wait-for-db] DATABASE_URL is not set');
  process.exit(1);
}

const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS ?? 120000);
const intervalMs = Number(process.env.DB_WAIT_INTERVAL_MS ?? 2000);

const deadline = Date.now() + timeoutMs;
let attempt = 0;

while (Date.now() < deadline) {
  attempt++;
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    console.log(`[wait-for-db] Database is ready (attempt ${attempt})`);
    process.exit(0);
  } catch (error) {
    try {
      await client.end();
    } catch {
      // ignore
    }
    const remainingMs = Math.max(0, deadline - Date.now());
    console.log(
      `[wait-for-db] Waiting for database... (attempt ${attempt}, remaining ${Math.ceil(
        remainingMs / 1000,
      )}s)`,
    );
    await sleep(intervalMs);
  }
}

console.error(`[wait-for-db] Timed out after ${timeoutMs}ms waiting for database`);
process.exit(1);

import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[sql-migrations] DATABASE_URL is not set');
  process.exit(1);
}

const migrationsDir = path.resolve(process.cwd(), 'scripts/database/migrations');

async function dirExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

if (!(await dirExists(migrationsDir))) {
  console.log(`[sql-migrations] No migrations directory found at ${migrationsDir}; skipping`);
  process.exit(0);
}

const entries = await fs.readdir(migrationsDir);
const migrationFiles = entries
  .filter((file) => file.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

if (migrationFiles.length === 0) {
  console.log('[sql-migrations] No .sql migration files found; skipping');
  process.exit(0);
}

const client = new Client({ connectionString });

try {
  await client.connect();

  const executed = [];

  for (const file of migrationFiles) {
    const fullPath = path.join(migrationsDir, file);
    const sqlContent = (await fs.readFile(fullPath, 'utf-8')).trim();

    if (!sqlContent) continue;

    await client.query('BEGIN');
    try {
      await client.query(sqlContent);
      await client.query('COMMIT');
      executed.push(file);
      console.log(`[sql-migrations] Executed ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[sql-migrations] Failed on ${file}`);
      throw error;
    }
  }

  console.log(`[sql-migrations] Done. Executed ${executed.length} file(s).`);
  process.exit(0);
} catch (error) {
  console.error('[sql-migrations] Migration run failed:', error);
  process.exit(1);
} finally {
  try {
    await client.end();
  } catch {
    // ignore
  }
}

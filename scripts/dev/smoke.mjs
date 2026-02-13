import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../..');
const backendDir = path.join(repoRoot, 'backend');
const backendEnvPath = path.join(backendDir, '.env');

function parseDotEnv(contents) {
  const parsed = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }
  return parsed;
}

function loadBackendDotEnvIfPresent() {
  if (!fs.existsSync(backendEnvPath)) return;
  const contents = fs.readFileSync(backendEnvPath, 'utf8');
  const parsed = parseDotEnv(contents);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (typeof code === 'number' && code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} failed (code=${code ?? 'null'} signal=${signal ?? 'null'})`));
    });
  });
}

loadBackendDotEnvIfPresent();

if (!process.env.DATABASE_URL) {
  console.error('[smoke] DATABASE_URL não está definido.');
  console.error('[smoke] Define no ambiente ou cria backend/.env com DATABASE_URL=...');
  process.exit(1);
}

console.log('[smoke] 1/2 A aplicar schema (Drizzle db:push quando necessário)...');
await run('node', [path.join(repoRoot, 'scripts/docker/run-drizzle-migrate.mjs')]);

const seedEnabled = process.env.SMOKE_SEED === '1' || process.env.SMOKE_SEED === 'true';
if (seedEnabled) {
  console.log('[smoke] 2/2 A executar seed (db:seed)...');
  await run('npm', ['run', 'db:seed'], { cwd: backendDir });
} else {
  console.log('[smoke] 2/2 Seed ignorado (define SMOKE_SEED=1 para executar db:seed).');
}

console.log('[smoke] OK. Próximos passos (dev):');
console.log('  - Backend:  cd backend && npm run dev');
console.log('  - Frontend: cd frontend && npm run dev');

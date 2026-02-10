import { spawn } from 'node:child_process';

const env = { ...process.env };

// Railway Postgres can present a self-signed cert chain.
// Limit the TLS bypass to the migration subprocess only.
const configured = env.PG_TLS_REJECT_UNAUTHORIZED ?? env.NODE_TLS_REJECT_UNAUTHORIZED;
if (configured === undefined && env.NODE_ENV === 'production') {
  env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const child = spawn('npm', ['run', 'db:migrate'], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (typeof code === 'number') process.exit(code);
  console.error(`[drizzle-migrate] exited via signal ${signal}`);
  process.exit(1);
});

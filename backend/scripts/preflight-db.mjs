import pkg from 'pg';

const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[preflight-db] DATABASE_URL não está definido');
  process.exit(1);
}

const client = new Client({ connectionString });

async function main() {
  await client.connect();

  const check = await client.query(
    "SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' LIMIT 1;",
  );

  if (check.rowCount && check.rowCount > 0) {
    console.log('[preflight-db] pgcrypto já está instalado');
    return;
  }

  console.log('[preflight-db] a instalar extensão pgcrypto…');
  try {
    await client.query('CREATE EXTENSION pgcrypto;');
    console.log('[preflight-db] extensão pgcrypto instalada');
  } catch (err) {
    console.error(
      '[preflight-db] falha ao instalar pgcrypto. Se o DB já tiver a extensão, confirme permissões/estado. Erro:',
      err,
    );
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('[preflight-db] erro inesperado:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await client.end();
    } catch {
      // ignore
    }
  });

import * as dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

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
    connectionString: process.env.DATABASE_URL || 'postgresql://cmms_user:cmms_password@localhost:5432/cmms_enterprise',
  },
  verbose: true,
  // In production (e.g. Render), this must be non-interactive.
  // Keep strict confirmations enabled for local/dev by default.
  strict: process.env.DRIZZLE_STRICT
    ? process.env.DRIZZLE_STRICT === 'true'
    : process.env.NODE_ENV !== 'production',
};

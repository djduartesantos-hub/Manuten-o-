import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  driver: 'pg',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://cmms_user:cmms_password@localhost:5432/cmms_enterprise',
  },
  verbose: true,
  strict: true,
});

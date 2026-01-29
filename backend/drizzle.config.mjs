import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://cmms_user:cmms_password@localhost:5432/cmms_enterprise',
  },
  verbose: true,
  strict: true,
});

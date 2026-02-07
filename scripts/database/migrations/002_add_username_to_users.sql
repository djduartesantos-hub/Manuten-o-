DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'username'
    ) THEN
      ALTER TABLE users ADD COLUMN username TEXT;
      UPDATE users
      SET username = LOWER(SPLIT_PART(email, '@', 1))
      WHERE username IS NULL OR username = '';
      ALTER TABLE users ALTER COLUMN username SET NOT NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'users_tenant_username_idx'
    ) THEN
      CREATE UNIQUE INDEX users_tenant_username_idx
        ON users (tenant_id, username);
    END IF;
  END IF;
END $$;

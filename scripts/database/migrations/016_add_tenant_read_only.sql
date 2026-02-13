-- 016_add_tenant_read_only.sql
-- Adds tenant-level read-only (quarantine) mode.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'is_read_only'
  ) THEN
    ALTER TABLE tenants ADD COLUMN is_read_only boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'read_only_reason'
  ) THEN
    ALTER TABLE tenants ADD COLUMN read_only_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'read_only_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN read_only_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'read_only_by'
  ) THEN
    ALTER TABLE tenants ADD COLUMN read_only_by uuid;
  END IF;
END $$;

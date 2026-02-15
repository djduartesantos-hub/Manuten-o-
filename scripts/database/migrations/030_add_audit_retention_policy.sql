-- Add audit retention to tenant security policies

DO $$
BEGIN
  IF to_regclass('public.tenant_security_policies') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'tenant_security_policies'
        AND column_name = 'audit_retention_days'
    ) THEN
      ALTER TABLE tenant_security_policies
        ADD COLUMN audit_retention_days integer NOT NULL DEFAULT 90;
    END IF;
  END IF;
END $$;

-- Create audit_logs table for existing deployments
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_values JSONB,
      new_values JSONB,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX audit_logs_tenant_id_idx ON audit_logs(tenant_id);
    CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
  END IF;
END $$;

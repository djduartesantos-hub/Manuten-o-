-- Create superadmin_audit_logs table (global audit trail for SuperAdmin actions)
DO $$
BEGIN
  IF to_regclass('public.superadmin_audit_logs') IS NULL THEN
    CREATE TABLE superadmin_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id UUID NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      affected_tenant_id UUID,
      metadata JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX superadmin_audit_logs_created_at_idx ON superadmin_audit_logs(created_at);
    CREATE INDEX superadmin_audit_logs_actor_user_id_idx ON superadmin_audit_logs(actor_user_id);
    CREATE INDEX superadmin_audit_logs_affected_tenant_id_idx ON superadmin_audit_logs(affected_tenant_id);
    CREATE INDEX superadmin_audit_logs_action_idx ON superadmin_audit_logs(action);
  END IF;
END $$;

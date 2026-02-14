-- Create tenant_security_policies table (password policy + login lockout)
DO $$
BEGIN
  IF to_regclass('public.tenant_security_policies') IS NULL THEN
    CREATE TABLE tenant_security_policies (
      tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,

      password_min_length integer NOT NULL DEFAULT 8,
      password_require_lower boolean NOT NULL DEFAULT true,
      password_require_upper boolean NOT NULL DEFAULT false,
      password_require_digit boolean NOT NULL DEFAULT true,
      password_require_special boolean NOT NULL DEFAULT false,

      max_failed_logins integer NOT NULL DEFAULT 8,
      failed_login_window_minutes integer NOT NULL DEFAULT 10,
      lockout_minutes integer NOT NULL DEFAULT 15,

      updated_at timestamptz NOT NULL DEFAULT NOW(),
      updated_by uuid
    );

    CREATE INDEX tenant_security_policies_updated_at_idx ON tenant_security_policies(updated_at);
  END IF;
END $$;

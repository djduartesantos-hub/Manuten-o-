-- Create user_mfa_totp table for MFA TOTP secrets

DO $$
BEGIN
  IF to_regclass('public.user_mfa_totp') IS NULL THEN
    CREATE TABLE user_mfa_totp (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      secret TEXT NOT NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      verified_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX user_mfa_totp_user_id_idx ON user_mfa_totp(user_id);
    CREATE INDEX user_mfa_totp_tenant_id_idx ON user_mfa_totp(tenant_id);
    CREATE INDEX user_mfa_totp_enabled_idx ON user_mfa_totp(is_enabled);
  END IF;
END $$;

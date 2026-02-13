-- Create auth_sessions and auth_login_events tables for session management
-- Used by backend session revocation + failed login logging

DO $$
BEGIN
  IF to_regclass('public.auth_sessions') IS NULL THEN
    CREATE TABLE auth_sessions (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      revoked_at TIMESTAMPTZ,
      revoked_by UUID
    );

    CREATE INDEX auth_sessions_user_id_idx ON auth_sessions(user_id);
    CREATE INDEX auth_sessions_tenant_user_id_idx ON auth_sessions(tenant_id, user_id);
    CREATE INDEX auth_sessions_revoked_at_idx ON auth_sessions(revoked_at);
  END IF;

  IF to_regclass('public.auth_login_events') IS NULL THEN
    CREATE TABLE auth_login_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      username TEXT NOT NULL,
      success BOOLEAN NOT NULL DEFAULT FALSE,
      ip_address TEXT,
      user_agent TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX auth_login_events_tenant_created_at_idx ON auth_login_events(tenant_id, created_at);
    CREATE INDEX auth_login_events_user_id_idx ON auth_login_events(user_id);
  END IF;
END $$;

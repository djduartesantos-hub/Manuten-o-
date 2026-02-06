-- ============================================================================
-- MIGRATION: Create tenants table (multi-tenant)
-- ============================================================================
-- Run this on existing databases to enable tenant slugs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  subscription_plan TEXT DEFAULT 'basic',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug);
CREATE INDEX IF NOT EXISTS tenants_active_idx ON tenants(is_active);

INSERT INTO tenants (id, name, slug, is_active)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Company', 'demo', true)
ON CONFLICT DO NOTHING;

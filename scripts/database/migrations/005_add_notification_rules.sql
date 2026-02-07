CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  channels TEXT[] DEFAULT ARRAY['in_app'],
  recipients TEXT[] DEFAULT ARRAY['assigned','creator','managers','plant_users'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_rules_tenant_event_idx
  ON notification_rules (tenant_id, event_type);

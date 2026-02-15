-- Notifications templates + webhooks + API keys + scheduled reports

DO $$
BEGIN
  IF to_regclass('public.notification_templates') IS NULL THEN
    CREATE TABLE notification_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      event_type TEXT NOT NULL,
      channel TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX notification_templates_tenant_id_idx ON notification_templates(tenant_id);
    CREATE UNIQUE INDEX notification_templates_tenant_event_channel_idx
      ON notification_templates(tenant_id, event_type, channel);
  END IF;

  IF to_regclass('public.webhook_endpoints') IS NULL THEN
    CREATE TABLE webhook_endpoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT NOT NULL,
      event_types TEXT[] DEFAULT ARRAY[]::TEXT[],
      headers JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX webhook_endpoints_tenant_id_idx ON webhook_endpoints(tenant_id);
    CREATE UNIQUE INDEX webhook_endpoints_tenant_name_idx ON webhook_endpoints(tenant_id, name);
  END IF;

  IF to_regclass('public.webhook_events') IS NULL THEN
    CREATE TABLE webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      event_type TEXT NOT NULL,
      entity TEXT,
      entity_id TEXT,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX webhook_events_tenant_id_idx ON webhook_events(tenant_id);
    CREATE INDEX webhook_events_tenant_event_idx ON webhook_events(tenant_id, event_type);
    CREATE INDEX webhook_events_tenant_created_idx ON webhook_events(tenant_id, created_at);
  END IF;

  IF to_regclass('public.webhook_deliveries') IS NULL THEN
    CREATE TABLE webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
      event_id UUID REFERENCES webhook_events(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempt_count INTEGER DEFAULT 0,
      last_attempt_at TIMESTAMPTZ,
      next_attempt_at TIMESTAMPTZ,
      response_status INTEGER,
      response_body TEXT,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX webhook_deliveries_tenant_id_idx ON webhook_deliveries(tenant_id);
    CREATE INDEX webhook_deliveries_webhook_id_idx ON webhook_deliveries(webhook_id);
    CREATE INDEX webhook_deliveries_webhook_status_idx ON webhook_deliveries(webhook_id, status);
    CREATE INDEX webhook_deliveries_next_attempt_idx ON webhook_deliveries(next_attempt_at);
  END IF;

  IF to_regclass('public.api_keys') IS NULL THEN
    CREATE TABLE api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
      last_used_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX api_keys_tenant_id_idx ON api_keys(tenant_id);
    CREATE UNIQUE INDEX api_keys_tenant_prefix_idx ON api_keys(tenant_id, key_prefix);
    CREATE INDEX api_keys_tenant_active_idx ON api_keys(tenant_id, is_active);
  END IF;

  IF to_regclass('public.scheduled_reports') IS NULL THEN
    CREATE TABLE scheduled_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL,
      send_day INTEGER NULL,
      send_time TEXT NOT NULL DEFAULT '09:00',
      recipients TEXT[] NOT NULL,
      report_type TEXT NOT NULL,
      include_charts BOOLEAN DEFAULT TRUE,
      include_data BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      last_sent_at TIMESTAMPTZ NULL,
      next_send_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX scheduled_reports_tenant_id_idx ON scheduled_reports(tenant_id);
    CREATE INDEX scheduled_reports_tenant_next_send_idx ON scheduled_reports(tenant_id, next_send_at);
  END IF;
END $$;

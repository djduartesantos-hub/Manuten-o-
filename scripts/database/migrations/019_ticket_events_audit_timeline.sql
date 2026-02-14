-- 019_ticket_events_audit_timeline.sql
-- Tickets: auditoria/timeline (eventos)

DO $$
BEGIN
  IF to_regclass('public.ticket_events') IS NULL THEN
    CREATE TABLE ticket_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      plant_id uuid NULL,
      level ticket_level NOT NULL DEFAULT 'fabrica',
      event_type text NOT NULL,
      message text NULL,
      meta jsonb NULL,
      actor_user_id uuid NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX ticket_events_ticket_id_created_at_idx ON ticket_events(ticket_id, created_at);
    CREATE INDEX ticket_events_tenant_id_created_at_idx ON ticket_events(tenant_id, created_at);
    CREATE INDEX ticket_events_plant_id_created_at_idx ON ticket_events(plant_id, created_at);
    CREATE INDEX ticket_events_event_type_idx ON ticket_events(event_type);
  END IF;
END $$;

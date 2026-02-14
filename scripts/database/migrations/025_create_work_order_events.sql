-- 025_create_work_order_events.sql
-- Timeline/history events for work orders (notes, status changes, attachments, etc.)

DO $$
BEGIN
  IF to_regclass('public.work_order_events') IS NULL THEN
    CREATE TABLE work_order_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
      work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      event_type text NOT NULL,
      message text,
      meta jsonb,
      actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX work_order_events_work_order_id_created_at_idx
      ON work_order_events(work_order_id, created_at);

    CREATE INDEX work_order_events_tenant_id_created_at_idx
      ON work_order_events(tenant_id, created_at);

    CREATE INDEX work_order_events_plant_id_created_at_idx
      ON work_order_events(plant_id, created_at);

    CREATE INDEX work_order_events_event_type_idx
      ON work_order_events(event_type);
  END IF;
END $$;

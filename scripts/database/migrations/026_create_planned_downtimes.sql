-- 026_create_planned_downtimes.sql
-- Paragens planeadas (planeamento/calendário)

CREATE TABLE IF NOT EXISTS planned_downtimes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,

  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,

  downtime_type text NOT NULL,        -- total | parcial
  downtime_category text NOT NULL,    -- producao | seguranca | energia | pecas | outras

  created_by uuid REFERENCES users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planned_downtimes_tenant_id_idx ON planned_downtimes(tenant_id);
CREATE INDEX IF NOT EXISTS planned_downtimes_plant_id_idx ON planned_downtimes(plant_id);
CREATE INDEX IF NOT EXISTS planned_downtimes_start_at_idx ON planned_downtimes(start_at);

-- Simple integrity checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planned_downtimes_time_check'
  ) THEN
    ALTER TABLE planned_downtimes
      ADD CONSTRAINT planned_downtimes_time_check CHECK (end_at > start_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planned_downtimes_type_check'
  ) THEN
    ALTER TABLE planned_downtimes
      ADD CONSTRAINT planned_downtimes_type_check CHECK (downtime_type IN ('total','parcial'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planned_downtimes_category_check'
  ) THEN
    ALTER TABLE planned_downtimes
      ADD CONSTRAINT planned_downtimes_category_check CHECK (downtime_category IN ('producao','seguranca','energia','pecas','outras'));
  END IF;
END $$;

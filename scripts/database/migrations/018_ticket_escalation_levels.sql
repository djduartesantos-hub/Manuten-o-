-- 018_ticket_escalation_levels.sql
-- Tickets: nível de encaminhamento (fábrica -> empresa -> superadmin) + plant_id + flags

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ticket_level'
  ) THEN
    CREATE TYPE ticket_level AS ENUM ('fabrica','empresa','superadmin');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.tickets') IS NOT NULL THEN
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS plant_id uuid NULL,
      ADD COLUMN IF NOT EXISTS level ticket_level NOT NULL DEFAULT 'fabrica',
      ADD COLUMN IF NOT EXISTS is_general boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS forwarded_by_user_id uuid NULL,
      ADD COLUMN IF NOT EXISTS forwarded_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS forward_note text NULL;

    CREATE INDEX IF NOT EXISTS tickets_plant_id_idx ON tickets(plant_id);
    CREATE INDEX IF NOT EXISTS tickets_level_idx ON tickets(level);
  END IF;
END $$;

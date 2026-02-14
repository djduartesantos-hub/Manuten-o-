-- 020_ticket_v2_fields_sla_source.sql
-- Tickets v2: prioridade/tags + SLA (response/resolution) + origem (diagnósticos)

-- Ensure priority enum exists (used elsewhere by Drizzle)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority') THEN
    CREATE TYPE priority AS ENUM ('baixa','media','alta','critica');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.tickets') IS NOT NULL THEN
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS priority priority NOT NULL DEFAULT 'media',
      ADD COLUMN IF NOT EXISTS tags text[] NULL,
      ADD COLUMN IF NOT EXISTS source_type text NULL,
      ADD COLUMN IF NOT EXISTS source_key text NULL,
      ADD COLUMN IF NOT EXISTS source_meta jsonb NULL,
      ADD COLUMN IF NOT EXISTS sla_response_deadline timestamptz NULL,
      ADD COLUMN IF NOT EXISTS sla_resolution_deadline timestamptz NULL,
      ADD COLUMN IF NOT EXISTS first_response_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS resolved_at timestamptz NULL;

    CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets(priority);
    CREATE INDEX IF NOT EXISTS tickets_sla_response_deadline_idx ON tickets(sla_response_deadline);
    CREATE INDEX IF NOT EXISTS tickets_sla_resolution_deadline_idx ON tickets(sla_resolution_deadline);
  END IF;
END $$;

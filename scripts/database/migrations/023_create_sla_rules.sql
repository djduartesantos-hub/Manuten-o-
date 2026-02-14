-- 023_create_sla_rules.sql
-- Create sla_rules table (used for work orders and tickets)

-- Ensure priority enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority') THEN
    CREATE TYPE priority AS ENUM ('baixa','media','alta','critica');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sla_rules') IS NULL THEN
    CREATE TABLE sla_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      entity_type text NOT NULL DEFAULT 'work_order',
      priority priority NOT NULL,
      response_time_hours integer NOT NULL,
      resolution_time_hours integer NOT NULL,
      is_active boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX sla_rules_tenant_id_idx ON sla_rules(tenant_id);
    CREATE INDEX sla_rules_tenant_entity_priority_idx ON sla_rules(tenant_id, entity_type, priority);
  END IF;
END $$;

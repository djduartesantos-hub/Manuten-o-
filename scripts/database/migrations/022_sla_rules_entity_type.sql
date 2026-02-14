-- 022_sla_rules_entity_type.sql
-- SLA rules: add entity_type so we can have work_order vs ticket SLA rules.

DO $$
BEGIN
  IF to_regclass('public.sla_rules') IS NOT NULL THEN
    -- Backward compatible: default to work_order
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sla_rules'
        AND column_name = 'entity_type'
    ) THEN
      ALTER TABLE sla_rules ADD COLUMN entity_type text NOT NULL DEFAULT 'work_order';
    END IF;

    CREATE INDEX IF NOT EXISTS sla_rules_tenant_entity_priority_idx ON sla_rules(tenant_id, entity_type, priority);
  END IF;
END $$;

-- ==========================================================================
-- MIGRATION: Preventive maintenance schedules
-- ==========================================================================

DO $$ BEGIN
  CREATE TYPE preventive_schedule_status AS ENUM (
    'planeada',
    'agendada',
    'confirmada',
    'em_execucao',
    'concluida',
    'fechada',
    'reagendada'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS preventive_maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,

  status preventive_schedule_status NOT NULL DEFAULT 'agendada',
  scheduled_for TIMESTAMPTZ NOT NULL,

  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  rescheduled_from TIMESTAMPTZ,
  rescheduled_at TIMESTAMPTZ,

  notes TEXT,

  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS pms_tenant_id_idx ON preventive_maintenance_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS pms_plant_id_idx ON preventive_maintenance_schedules(plant_id);
CREATE INDEX IF NOT EXISTS pms_plan_id_idx ON preventive_maintenance_schedules(plan_id);
CREATE INDEX IF NOT EXISTS pms_asset_id_idx ON preventive_maintenance_schedules(asset_id);
CREATE INDEX IF NOT EXISTS pms_scheduled_for_idx ON preventive_maintenance_schedules(scheduled_for);
CREATE INDEX IF NOT EXISTS pms_status_idx ON preventive_maintenance_schedules(status);

-- 012_remove_deprecated_preventive_schedule_statuses.sql
-- Remove deprecated preventive schedule statuses (planeada, confirmada) and normalize existing data.

-- 1) Create the new enum type (temporary name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preventive_schedule_status_no_deprecated') THEN
    CREATE TYPE preventive_schedule_status_no_deprecated AS ENUM (
      'agendada',
      'em_execucao',
      'concluida',
      'fechada',
      'reagendada'
    );
  END IF;
END $$;

-- 2) Convert column to TEXT to remap values
ALTER TABLE IF EXISTS preventive_maintenance_schedules
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE IF EXISTS preventive_maintenance_schedules
  ALTER COLUMN status TYPE TEXT USING status::text;

-- 3) Normalize deprecated/legacy values
UPDATE preventive_maintenance_schedules
SET status = 'agendada'
WHERE status IN ('planeada', 'confirmada');

-- Guard against any unexpected values
UPDATE preventive_maintenance_schedules
SET status = 'agendada'
WHERE status NOT IN (
  'agendada',
  'em_execucao',
  'concluida',
  'fechada',
  'reagendada'
);

-- 4) Switch column to the new enum
ALTER TABLE IF EXISTS preventive_maintenance_schedules
  ALTER COLUMN status TYPE preventive_schedule_status_no_deprecated USING status::preventive_schedule_status_no_deprecated;

ALTER TABLE IF EXISTS preventive_maintenance_schedules
  ALTER COLUMN status SET DEFAULT 'agendada';

-- 5) Replace old enum type name with the new one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preventive_schedule_status') THEN
    DROP TYPE preventive_schedule_status;
  END IF;
END $$;

ALTER TYPE preventive_schedule_status_no_deprecated RENAME TO preventive_schedule_status;

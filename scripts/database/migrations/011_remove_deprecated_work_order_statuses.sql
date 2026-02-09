-- 011_remove_deprecated_work_order_statuses.sql
-- Remove deprecated work order statuses (aprovada, planeada) and normalize existing data.

-- 1) Create the new enum type (temporary name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_no_deprecated') THEN
    CREATE TYPE order_status_no_deprecated AS ENUM (
      'aberta',
      'em_analise',
      'em_execucao',
      'em_pausa',
      'concluida',
      'fechada',
      'cancelada'
    );
  END IF;
END $$;

-- 2) Convert column to TEXT to remap values
ALTER TABLE IF EXISTS work_orders
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE IF EXISTS work_orders
  ALTER COLUMN status TYPE TEXT USING status::text;

-- 3) Normalize deprecated/legacy values
UPDATE work_orders SET status = 'em_analise' WHERE status IN ('aprovada', 'planeada');
UPDATE work_orders SET status = 'em_analise' WHERE status IN ('atribuida');
UPDATE work_orders SET status = 'em_execucao' WHERE status IN ('em_curso');

-- Guard against any unexpected values
UPDATE work_orders
SET status = 'aberta'
WHERE status NOT IN (
  'aberta',
  'em_analise',
  'em_execucao',
  'em_pausa',
  'concluida',
  'fechada',
  'cancelada'
);

-- 4) Switch column to the new enum
ALTER TABLE IF EXISTS work_orders
  ALTER COLUMN status TYPE order_status_no_deprecated USING status::order_status_no_deprecated;

ALTER TABLE IF EXISTS work_orders
  ALTER COLUMN status SET DEFAULT 'aberta';

-- 5) Replace old enum type name with the new one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    DROP TYPE order_status;
  END IF;
END $$;

ALTER TYPE order_status_no_deprecated RENAME TO order_status;

-- 009_update_work_order_statuses.sql
-- Updates work order status enum to new lifecycle and adds optional technical sub-status + closing metadata.

-- 1) Create the new enum type (temporary name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_new') THEN
    CREATE TYPE order_status_new AS ENUM (
      'aberta',
      'em_analise',
      'aprovada',
      'planeada',
      'em_execucao',
      'em_pausa',
      'concluida',
      'fechada',
      'cancelada'
    );
  END IF;
END $$;

-- 2) Add new columns to work_orders
ALTER TABLE IF EXISTS work_orders
  ADD COLUMN IF NOT EXISTS sub_status TEXT;

ALTER TABLE IF EXISTS work_orders
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS work_orders
  ADD COLUMN IF NOT EXISTS closed_by UUID;

-- 3) Add FK for closed_by (best-effort, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_closed_by_fkey'
  ) THEN
    ALTER TABLE IF EXISTS work_orders
      ADD CONSTRAINT work_orders_closed_by_fkey
      FOREIGN KEY (closed_by) REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4) Convert existing enum values safely by going through TEXT
ALTER TABLE IF EXISTS work_orders
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE IF EXISTS work_orders
  ALTER COLUMN status TYPE TEXT USING status::text;

-- Map legacy statuses to the new lifecycle
UPDATE work_orders SET status = 'em_analise' WHERE status = 'atribuida';
UPDATE work_orders SET status = 'em_execucao' WHERE status = 'em_curso';

-- Guard against any unexpected values
UPDATE work_orders
SET status = 'aberta'
WHERE status NOT IN (
  'aberta',
  'em_analise',
  'aprovada',
  'planeada',
  'em_execucao',
  'em_pausa',
  'concluida',
  'fechada',
  'cancelada'
);

-- 5) Switch column to the new enum
ALTER TABLE IF EXISTS work_orders
  ALTER COLUMN status TYPE order_status_new USING status::order_status_new;

ALTER TABLE IF EXISTS work_orders
  ALTER COLUMN status SET DEFAULT 'aberta';

-- 6) Replace old enum type name with the new one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    -- order_status is now unused after the column type change above
    DROP TYPE order_status;
  END IF;
END $$;

ALTER TYPE order_status_new RENAME TO order_status;

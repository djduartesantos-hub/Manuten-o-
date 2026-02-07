-- Add missing columns to work_order_tasks for existing deployments
DO $$
BEGIN
  IF to_regclass('public.work_order_tasks') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'work_order_tasks'
        AND column_name = 'task_id'
    ) THEN
      ALTER TABLE work_order_tasks ADD COLUMN task_id UUID REFERENCES maintenance_tasks(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'work_order_tasks'
        AND column_name = 'notes'
    ) THEN
      ALTER TABLE work_order_tasks ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'work_order_tasks'
        AND column_name = 'sequence'
    ) THEN
      ALTER TABLE work_order_tasks ADD COLUMN sequence INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

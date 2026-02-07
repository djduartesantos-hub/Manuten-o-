DO $$
BEGIN
  IF to_regclass('public.work_orders') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'work_orders'
        AND column_name = 'work_performed'
    ) THEN
      ALTER TABLE work_orders ADD COLUMN work_performed TEXT;
    END IF;
  END IF;
END $$;

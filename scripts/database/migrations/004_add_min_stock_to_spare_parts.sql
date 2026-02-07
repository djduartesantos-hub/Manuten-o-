DO $$
BEGIN
  IF to_regclass('public.spare_parts') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'spare_parts'
        AND column_name = 'min_stock'
    ) THEN
      ALTER TABLE spare_parts ADD COLUMN min_stock INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

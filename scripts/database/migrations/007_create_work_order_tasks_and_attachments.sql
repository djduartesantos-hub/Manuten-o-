-- Create work_order_tasks and attachments tables for existing deployments
DO $$
BEGIN
  IF to_regclass('public.work_order_tasks') IS NULL THEN
    CREATE TABLE work_order_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX work_order_tasks_work_order_id_idx ON work_order_tasks(work_order_id);
  END IF;

  IF to_regclass('public.attachments') IS NULL THEN
    CREATE TABLE attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      uploaded_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX attachments_work_order_id_idx ON attachments(work_order_id);
    CREATE INDEX attachments_tenant_id_idx ON attachments(tenant_id);
  END IF;
END $$;

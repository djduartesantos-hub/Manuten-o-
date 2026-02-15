-- Create work order workflow configuration table

CREATE TABLE IF NOT EXISTS work_order_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_order_workflows_tenant_id_idx ON work_order_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS work_order_workflows_plant_id_idx ON work_order_workflows(plant_id);
CREATE INDEX IF NOT EXISTS work_order_workflows_default_idx ON work_order_workflows(tenant_id, plant_id, is_default);

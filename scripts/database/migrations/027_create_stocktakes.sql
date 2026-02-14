-- Create stocktakes (inventory counts) tables

CREATE TABLE IF NOT EXISTS stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aberta',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  close_notes TEXT
);

CREATE INDEX IF NOT EXISTS stocktakes_tenant_id_idx ON stocktakes(tenant_id);
CREATE INDEX IF NOT EXISTS stocktakes_plant_id_idx ON stocktakes(plant_id);
CREATE INDEX IF NOT EXISTS stocktakes_status_idx ON stocktakes(status);
CREATE INDEX IF NOT EXISTS stocktakes_created_at_idx ON stocktakes(created_at);

CREATE TABLE IF NOT EXISTS stocktake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  stocktake_id UUID NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  expected_qty INT NOT NULL,
  counted_qty INT,
  unit_cost NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stocktake_id, spare_part_id)
);

CREATE INDEX IF NOT EXISTS stocktake_items_tenant_id_idx ON stocktake_items(tenant_id);
CREATE INDEX IF NOT EXISTS stocktake_items_stocktake_id_idx ON stocktake_items(stocktake_id);
CREATE INDEX IF NOT EXISTS stocktake_items_spare_part_id_idx ON stocktake_items(spare_part_id);

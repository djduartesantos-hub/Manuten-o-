-- Create purchases (requests, orders, receipts)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_request_status') THEN
    CREATE TYPE purchase_request_status AS ENUM (
      'draft',
      'submitted',
      'approved',
      'rejected',
      'ordered',
      'received',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_status') THEN
    CREATE TYPE purchase_order_status AS ENUM (
      'draft',
      'sent',
      'partially_received',
      'received',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status purchase_request_status NOT NULL DEFAULT 'draft',
  priority priority DEFAULT 'media',
  needed_by TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_requests_tenant_id_idx ON purchase_requests(tenant_id);
CREATE INDEX IF NOT EXISTS purchase_requests_plant_id_idx ON purchase_requests(plant_id);
CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS purchase_requests_created_at_idx ON purchase_requests(created_at);

CREATE TABLE IF NOT EXISTS purchase_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity INT NOT NULL,
  unit_cost NUMERIC(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_request_items_request_id_idx ON purchase_request_items(request_id);
CREATE INDEX IF NOT EXISTS purchase_request_items_spare_part_id_idx ON purchase_request_items(spare_part_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  request_id UUID REFERENCES purchase_requests(id) ON DELETE SET NULL,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  ordered_at TIMESTAMPTZ,
  expected_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_orders_tenant_id_idx ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS purchase_orders_plant_id_idx ON purchase_orders(plant_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_id_idx ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS purchase_orders_created_at_idx ON purchase_orders(created_at);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  unit_cost NUMERIC(15,2),
  received_quantity INT NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS purchase_order_items_order_id_idx ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_spare_part_id_idx ON purchase_order_items(spare_part_id);

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  received_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_receipts_order_id_idx ON purchase_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS purchase_receipts_plant_id_idx ON purchase_receipts(plant_id);

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
  spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  unit_cost NUMERIC(15,2),
  stock_movement_id UUID REFERENCES stock_movements(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS purchase_receipt_items_receipt_id_idx ON purchase_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS purchase_receipt_items_spare_part_id_idx ON purchase_receipt_items(spare_part_id);

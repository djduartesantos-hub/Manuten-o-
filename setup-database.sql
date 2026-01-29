-- ========================================
-- MANUTEN-O CMMS DATABASE SETUP
-- Manual SQL Script for PostgreSQL
-- ========================================

-- Drop existing database if needed (CAUTION: This will delete all data!)
-- DROP DATABASE IF EXISTS cmms_enterprise;
-- DROP USER IF EXISTS cmms_user;

-- ========================================
-- 1. CREATE USER AND DATABASE
-- ========================================

-- Create database user
CREATE USER cmms_user WITH PASSWORD 'cmms_password';

-- Create database
CREATE DATABASE cmms_enterprise
  OWNER cmms_user
  ENCODING 'UTF8'
  LOCALE 'pt_PT.UTF-8'
  LC_COLLATE 'pt_PT.UTF-8'
  LC_CTYPE 'pt_PT.UTF-8';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cmms_enterprise TO cmms_user;

-- ========================================
-- 2. CONNECT TO NEW DATABASE
-- ========================================
-- You need to run: psql -U cmms_user -d cmms_enterprise -h localhost
-- Then paste the rest of this script

-- ========================================
-- 3. ENUM TYPES
-- ========================================

CREATE TYPE order_status AS ENUM ('aberta', 'atribuida', 'em_curso', 'concluida', 'cancelada');
CREATE TYPE maintenance_type AS ENUM ('preventiva', 'corretiva');
CREATE TYPE priority AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE stock_movement_type AS ENUM ('entrada', 'saida', 'ajuste');

-- ========================================
-- 4. CORE TABLES
-- ========================================

-- Tenants (Empresas)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  subscription_plan TEXT DEFAULT 'basic',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX tenants_slug_idx ON tenants(slug);

-- Plants (Fábricas)
CREATE TABLE plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);

CREATE INDEX plants_tenant_id_idx ON plants(tenant_id);
CREATE INDEX plants_tenant_code_idx ON plants(tenant_id, code);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'tecnico',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, email)
);

CREATE INDEX users_tenant_id_idx ON users(tenant_id);
CREATE INDEX users_tenant_email_idx ON users(tenant_id, email);

-- User Plants (N:N relationship)
CREATE TABLE user_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, plant_id)
);

CREATE INDEX user_plants_user_plant_idx ON user_plants(user_id, plant_id);

-- Asset Categories
CREATE TABLE asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX asset_categories_tenant_id_idx ON asset_categories(tenant_id);

-- Assets (Equipamentos)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES asset_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  qr_code TEXT,
  model TEXT,
  manufacturer TEXT,
  serial_number TEXT,
  location TEXT,
  status TEXT DEFAULT 'operacional',
  acquisition_date TIMESTAMPTZ,
  acquisition_cost DECIMAL(15, 2),
  meter_type TEXT,
  current_meter_value DECIMAL(15, 2),
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  UNIQUE(plant_id, code)
);

CREATE INDEX assets_tenant_id_idx ON assets(tenant_id);
CREATE INDEX assets_plant_id_idx ON assets(plant_id);
CREATE INDEX assets_plant_code_idx ON assets(plant_id, code);

-- ========================================
-- 5. MAINTENANCE TABLES
-- ========================================

-- Maintenance Plans
CREATE TABLE maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type maintenance_type NOT NULL DEFAULT 'preventiva',
  frequency_type TEXT NOT NULL,
  frequency_value INTEGER NOT NULL,
  meter_threshold DECIMAL(15, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX maintenance_plans_asset_id_idx ON maintenance_plans(asset_id);
CREATE INDEX maintenance_plans_tenant_id_idx ON maintenance_plans(tenant_id);

-- Maintenance Tasks (Checklists)
CREATE TABLE maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX maintenance_tasks_plan_id_idx ON maintenance_tasks(plan_id);

-- Work Orders
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  plan_id UUID REFERENCES maintenance_plans(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status order_status NOT NULL DEFAULT 'aberta',
  priority priority NOT NULL DEFAULT 'media',
  scheduled_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours DECIMAL(8, 2),
  actual_hours DECIMAL(8, 2),
  notes TEXT,
  sla_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX work_orders_tenant_id_idx ON work_orders(tenant_id);
CREATE INDEX work_orders_plant_id_idx ON work_orders(plant_id);
CREATE INDEX work_orders_asset_id_idx ON work_orders(asset_id);
CREATE INDEX work_orders_status_idx ON work_orders(status);

-- Work Order Tasks
CREATE TABLE work_order_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  task_id UUID REFERENCES maintenance_tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  sequence INTEGER DEFAULT 0
);

CREATE INDEX work_order_tasks_work_order_id_idx ON work_order_tasks(work_order_id);

-- ========================================
-- 6. SPARE PARTS & STOCK TABLES
-- ========================================

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX suppliers_tenant_id_idx ON suppliers(tenant_id);

-- Spare Parts
CREATE TABLE spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_cost DECIMAL(15, 2),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tenant_id, code)
);

CREATE INDEX spare_parts_tenant_id_idx ON spare_parts(tenant_id);
CREATE INDEX spare_parts_tenant_code_idx ON spare_parts(tenant_id, code);

-- Stock Movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(15, 2),
  total_cost DECIMAL(15, 2),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX stock_movements_tenant_id_idx ON stock_movements(tenant_id);
CREATE INDEX stock_movements_plant_id_idx ON stock_movements(plant_id);

-- ========================================
-- 7. METER READINGS
-- ========================================

CREATE TABLE meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  reading_value DECIMAL(15, 2) NOT NULL,
  reading_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  recorded_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX meter_readings_asset_id_idx ON meter_readings(asset_id);
CREATE INDEX meter_readings_tenant_id_idx ON meter_readings(tenant_id);

-- ========================================
-- 8. ATTACHMENTS
-- ========================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

-- ========================================
-- 9. AUDIT LOGS
-- ========================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX audit_logs_tenant_id_idx ON audit_logs(tenant_id);
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);

-- ========================================
-- 10. SLA RULES
-- ========================================

CREATE TABLE sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  priority priority NOT NULL,
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX sla_rules_tenant_id_idx ON sla_rules(tenant_id);

-- ========================================
-- 11. SEED DATA (Demo)
-- ========================================

-- Insert demo tenant
INSERT INTO tenants (id, name, slug, description, subscription_plan, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'CMMS Enterprise Demo',
  'cmms-demo',
  'Demo tenant for CMMS Enterprise',
  'enterprise',
  TRUE
) ON CONFLICT DO NOTHING;

-- Insert demo plant
INSERT INTO plants (id, tenant_id, name, code, address, city, country, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'Fábrica Principal',
  'PLANT-001',
  'Rua Industrial, 123',
  'Lisboa',
  'Portugal',
  TRUE
) ON CONFLICT DO NOTHING;

-- Insert demo asset category
INSERT INTO asset_categories (id, tenant_id, name, description)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440000',
  'Equipamento Pesado',
  'Equipamentos de grande porte'
) ON CONFLICT DO NOTHING;

-- Insert demo admin user (password: Admin@123456 hashed)
INSERT INTO users (
  id, tenant_id, email, password_hash, first_name, last_name, role, is_active
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440000',
  'admin@cmms.com',
  '$2b$10$n9J3.iMXsL/TtdN1eUyEqu3DKXWXVh/D.5hRKKf1qf8uKKJgfOJly',
  'Admin',
  'CMMS',
  'superadmin',
  TRUE
) ON CONFLICT DO NOTHING;

-- Insert demo assets
INSERT INTO assets (
  id, tenant_id, plant_id, category_id, name, code, model, manufacturer, 
  serial_number, location, status, meter_type, is_critical
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Equipamento 1',
    'ASSET-001',
    'Model-X1',
    'TechMakers Inc',
    'SN-00001',
    'Seção 1',
    'operacional',
    'hours',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Equipamento 2',
    'ASSET-002',
    'Model-X2',
    'TechMakers Inc',
    'SN-00002',
    'Seção 2',
    'operacional',
    'hours',
    FALSE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Equipamento 3',
    'ASSET-003',
    'Model-X3',
    'TechMakers Inc',
    'SN-00003',
    'Seção 3',
    'operacional',
    'hours',
    FALSE
  )
ON CONFLICT DO NOTHING;

-- ========================================
-- 12. VERIFY SETUP
-- ========================================

SELECT 'Tenants' AS table_name, COUNT(*) AS row_count FROM tenants
UNION ALL
SELECT 'Plants', COUNT(*) FROM plants
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Assets', COUNT(*) FROM assets
UNION ALL
SELECT 'Asset Categories', COUNT(*) FROM asset_categories;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
-- If you see the above results without errors, the database setup is complete!
-- Admin user credentials: admin@cmms.com / Admin@123456

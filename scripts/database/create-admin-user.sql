-- ============================================================================
-- CRIAR BASE DE DADOS CMMS COMPLETA MANUALMENTE
-- ============================================================================
-- Script SQL completo para criar toda a base de dados do CMMS
-- Inclui: Tipos (enums), Tabelas, Índices, Dados iniciais (Admin + Planta)
--
-- Versão: 1.0
-- Data: 2026-02-05
-- ============================================================================

-- ============================================================================
-- STEP 1: CRIAR ENUMS (Tipos de dados)
-- ============================================================================

CREATE TYPE order_status AS ENUM (
  'aberta',
  'atribuida',
  'em_curso',
  'concluida',
  'cancelada'
);

CREATE TYPE maintenance_type AS ENUM (
  'preventiva',
  'corretiva'
);

CREATE TYPE priority AS ENUM (
  'baixa',
  'media',
  'alta',
  'critica'
);

CREATE TYPE stock_movement_type AS ENUM (
  'entrada',
  'saida',
  'ajuste'
);

-- ============================================================================
-- STEP 2: CRIAR TABELAS
-- ============================================================================

-- Tabela: Plants (Fábricas)
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Tabela: Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'tecnico',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Tabela: User Plants (Relação N:N)
CREATE TABLE IF NOT EXISTS user_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Asset Categories
CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Assets (Equipamentos)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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
  acquisition_date TIMESTAMP WITH TIME ZONE,
  acquisition_cost NUMERIC(15, 2),
  meter_type TEXT,
  current_meter_value NUMERIC(15, 2),
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Tabela: Maintenance Plans
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type maintenance_type NOT NULL DEFAULT 'preventiva',
  frequency_type TEXT NOT NULL,
  frequency_value INTEGER NOT NULL,
  meter_threshold NUMERIC(15, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Maintenance Tasks
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  plan_id UUID REFERENCES maintenance_plans(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status order_status NOT NULL DEFAULT 'aberta',
  priority priority NOT NULL DEFAULT 'media',
  scheduled_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours NUMERIC(8, 2),
  actual_hours NUMERIC(8, 2),
  notes TEXT,
  sla_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Work Order Tasks
CREATE TABLE IF NOT EXISTS work_order_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  task_id UUID REFERENCES maintenance_tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  sequence INTEGER DEFAULT 0
);

-- Tabela: Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Spare Parts
CREATE TABLE IF NOT EXISTS spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_cost NUMERIC(15, 2),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(15, 2),
  total_cost NUMERIC(15, 2),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Meter Readings
CREATE TABLE IF NOT EXISTS meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  reading_value NUMERIC(15, 2) NOT NULL,
  reading_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  recorded_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: SLA Rules
CREATE TABLE IF NOT EXISTS sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  priority priority NOT NULL,
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Alert Configurations
CREATE TABLE IF NOT EXISTS alert_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  time_unit TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notify_roles TEXT[],
  notify_email BOOLEAN DEFAULT TRUE,
  notify_push BOOLEAN DEFAULT FALSE,
  escalate_after_hours INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Alerts History
CREATE TABLE IF NOT EXISTS alerts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  alert_config_id UUID NOT NULL REFERENCES alert_configurations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Asset Documents
CREATE TABLE IF NOT EXISTS asset_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size_mb NUMERIC(5, 2),
  file_extension TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  version_number INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT TRUE,
  tags TEXT[],
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela: Asset Document Versions
CREATE TABLE IF NOT EXISTS asset_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES asset_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  change_log TEXT,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- STEP 3: CRIAR ÍNDICES
-- ============================================================================

-- Índices para Plants
CREATE INDEX IF NOT EXISTS plants_tenant_id_idx ON plants(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS plants_tenant_code_idx ON plants(tenant_id, code);

-- Índices para Users
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_idx ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users(tenant_id);

-- Índices para User Plants
CREATE UNIQUE INDEX IF NOT EXISTS user_plants_user_plant_idx ON user_plants(user_id, plant_id);

-- Índices para Asset Categories
CREATE INDEX IF NOT EXISTS asset_categories_tenant_id_idx ON asset_categories(tenant_id);

-- Índices para Assets
CREATE INDEX IF NOT EXISTS assets_tenant_id_idx ON assets(tenant_id);
CREATE INDEX IF NOT EXISTS assets_plant_id_idx ON assets(plant_id);
CREATE UNIQUE INDEX IF NOT EXISTS assets_plant_code_idx ON assets(plant_id, code);

-- Índices para Maintenance Plans
CREATE INDEX IF NOT EXISTS maintenance_plans_asset_id_idx ON maintenance_plans(asset_id);
CREATE INDEX IF NOT EXISTS maintenance_plans_tenant_id_idx ON maintenance_plans(tenant_id);

-- Índices para Maintenance Tasks
CREATE INDEX IF NOT EXISTS maintenance_tasks_plan_id_idx ON maintenance_tasks(plan_id);

-- Índices para Work Orders
CREATE INDEX IF NOT EXISTS work_orders_tenant_id_idx ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS work_orders_plant_id_idx ON work_orders(plant_id);
CREATE INDEX IF NOT EXISTS work_orders_asset_id_idx ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS work_orders_status_idx ON work_orders(status);

-- Índices para Work Order Tasks
CREATE INDEX IF NOT EXISTS work_order_tasks_work_order_id_idx ON work_order_tasks(work_order_id);

-- Índices para Spare Parts
CREATE INDEX IF NOT EXISTS spare_parts_tenant_id_idx ON spare_parts(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS spare_parts_tenant_code_idx ON spare_parts(tenant_id, code);

-- Índices para Stock Movements
CREATE INDEX IF NOT EXISTS stock_movements_tenant_id_idx ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS stock_movements_plant_id_idx ON stock_movements(plant_id);

-- Índices para Meter Readings
CREATE INDEX IF NOT EXISTS meter_readings_asset_id_idx ON meter_readings(asset_id);
CREATE INDEX IF NOT EXISTS meter_readings_tenant_id_idx ON meter_readings(tenant_id);

-- Índices para Attachments
CREATE INDEX IF NOT EXISTS attachments_work_order_id_idx ON attachments(work_order_id);
CREATE INDEX IF NOT EXISTS attachments_tenant_id_idx ON attachments(tenant_id);

-- Índices para Audit Logs
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);

-- Índices para SLA Rules
CREATE INDEX IF NOT EXISTS sla_rules_tenant_id_idx ON sla_rules(tenant_id);

-- Índices para Alert Configurations
CREATE INDEX IF NOT EXISTS alert_config_tenant_id_idx ON alert_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS alert_config_asset_id_idx ON alert_configurations(asset_id);

-- Índices para Alerts History
CREATE INDEX IF NOT EXISTS alerts_history_tenant_id_idx ON alerts_history(tenant_id);
CREATE INDEX IF NOT EXISTS alerts_history_asset_id_idx ON alerts_history(asset_id);
CREATE INDEX IF NOT EXISTS alerts_history_severity_idx ON alerts_history(severity);

-- Índices para Asset Documents
CREATE INDEX IF NOT EXISTS asset_docs_tenant_id_idx ON asset_documents(tenant_id);
CREATE INDEX IF NOT EXISTS asset_docs_asset_id_idx ON asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS asset_docs_type_idx ON asset_documents(document_type);

-- Índices para Asset Document Versions
CREATE INDEX IF NOT EXISTS doc_versions_doc_id_idx ON asset_document_versions(document_id);

-- ============================================================================
-- STEP 4: INSERIR DADOS INICIAIS
-- ============================================================================

-- Tenant ID padrão (single-tenant mode)
-- Este é o tenant ID que o backend usa por padrão
-- Se mudar este valor, atualize também: backend/src/config/constants.ts

-- Inserir Planta Padrão
INSERT INTO plants (
  id,
  tenant_id,
  name,
  code,
  address,
  city,
  country,
  is_active
)
VALUES (
  'fab00000-0000-0000-0000-000000000001',
  '550e8400-e29b-41d4-a716-446655440000',
  'Fábrica Principal',
  'PLANT-001',
  'Rua Industrial, 123',
  'Lisboa',
  'Portugal',
  true
)
ON CONFLICT DO NOTHING;

-- Inserir Usuário Admin
-- Email: admin@cmms.com
-- Senha: Admin@123456 (hash bcrypt)
INSERT INTO users (
  id,
  tenant_id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  is_active
)
VALUES (
  'user000000-0000-0000-0000-000000000001',
  '550e8400-e29b-41d4-a716-446655440000',
  'admin@cmms.com',
  '$2b$10$Nb1.BH1w2X0qTBD9GDdfBOhDKVaYM3XvdVLpNaY7Zo.aDIQdRvVra',
  'Admin',
  'CMMS',
  'superadmin',
  true
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Vincular Admin à Planta
INSERT INTO user_plants (
  id,
  user_id,
  plant_id
)
VALUES (
  'userplant000-0000-0000-0000-000000000001',
  'user000000-0000-0000-0000-000000000001',
  'fab00000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 5: VERIFICAÇÃO
-- ============================================================================

-- Mostrar usuários criados
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.is_active,
  p.name as plant_name,
  u.created_at
FROM users u
LEFT JOIN user_plants up ON u.id = up.user_id
LEFT JOIN plants p ON up.plant_id = p.id
WHERE u.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY u.created_at DESC;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
--
-- 1. TENANT ID: 550e8400-e29b-41d4-a716-446655440000
--    Este é o DEFAULT_TENANT_ID usado no backend (modo single-tenant)
--    Localizado em: backend/src/config/constants.ts
--
-- 2. CREDENCIAIS PADRÃO:
--    Email: admin@cmms.com
--    Senha: Admin@123456
--    Role: superadmin
--
-- 3. PASSWORD HASH:
--    Este é o hash bcrypt de "Admin@123456" com 10 rounds
--    Para gerar outro hash, use:
--      Node.js: node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('SENHA', 10))"
--      Python: python3 -c "import bcrypt; print(bcrypt.hashpw(b'SENHA', bcrypt.gensalt(10)).decode())"
--
-- 4. TIPOS (ENUMS):
--    - order_status: aberta, atribuida, em_curso, concluida, cancelada
--    - maintenance_type: preventiva, corretiva
--    - priority: baixa, media, alta, critica
--    - stock_movement_type: entrada, saida, ajuste
--
-- ============================================================================

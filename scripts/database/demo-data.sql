-- ============================================================================
-- DADOS DE DEMONSTRAÇÃO PARA CMMS
-- ============================================================================
-- Script SQL para carregar dados demo realistas
-- Inclui: Categorias, Equipamentos, Planos de Manutenção, etc.
--

-- Garantir tenant demo
INSERT INTO tenants (id, name, slug, is_active)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Company', 'demo', true)
ON CONFLICT DO NOTHING;
-- IMPORTANTE: Execute primeiro o create-admin-user.sql
-- Depois execute este script
--
-- NOTAS IMPORTANTES:
-- - Este script pode ser executado múltiplas vezes (é idempotente)
-- - Usa ON CONFLICT DO NOTHING para evitar erros de duplicatas
-- - Se precisar limpar dados, descomente as linhas de DELETE/TRUNCATE abaixo
-- ============================================================================

-- ============================================================================
-- CONSTANTS: IDs padrão do sistema (single-tenant mode)
-- ============================================================================
-- Tenant ID: 550e8400-e29b-41d4-a716-446655440000
-- Plant ID: 0fab0000-0000-0000-0000-000000000001
-- Admin User ID: 00000001-0000-0000-0000-000000000001

-- ============================================================================
-- LIMPEZA OPCIONAL: Descomente as linhas abaixo se precisar resetar dados demo
-- ============================================================================
-- TRUNCATE TABLE maintenance_plans CASCADE;
-- TRUNCATE TABLE assets CASCADE;
-- TRUNCATE TABLE asset_categories CASCADE;
-- DELETE FROM maintenance_plans WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
-- DELETE FROM assets WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
-- DELETE FROM asset_categories WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- ============================================================================
-- STEP 1: INSERIR CATEGORIAS DE EQUIPAMENTOS
-- ============================================================================

INSERT INTO asset_categories (
  id,
  tenant_id,
  name,
  description
)
VALUES
  ('10000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'Bombas', 'Equipamentos de bombeamento e circulação'),
  ('10000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'Motores', 'Motores elétricos e industriais'),
  ('10000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', 'Compressores', 'Compressores de ar e fluidos'),
  ('10000000-0000-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440000', 'Conversores', 'Conversores de frequência e energia'),
  ('10000000-0000-0000-0000-000000000005', '550e8400-e29b-41d4-a716-446655440000', 'Válvulas', 'Válvulas de controle e segurança'),
  ('10000000-0000-0000-0000-000000000006', '550e8400-e29b-41d4-a716-446655440000', 'Sensores', 'Sensores de temperatura, pressão e proximidade'),
  ('10000000-0000-0000-0000-000000000007', '550e8400-e29b-41d4-a716-446655440000', 'Transformadores', 'Transformadores de energia elétrica'),
  ('10000000-0000-0000-0000-000000000008', '550e8400-e29b-41d4-a716-446655440000', 'Ventiladores', 'Ventiladores industriais e de arrefecimento')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: INSERIR EQUIPAMENTOS (ASSETS)
-- ============================================================================

INSERT INTO assets (
  id,
  tenant_id,
  plant_id,
  category_id,
  name,
  code,
  model,
  manufacturer,
  serial_number,
  location,
  status,
  acquisition_date,
  acquisition_cost,
  meter_type,
  current_meter_value,
  is_critical
)
VALUES
  -- Bombas
  ('20000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Bomba Centrífuga A', 'PUMP-001', 'BCF-150', 'KSB', 'SN-202201-001', 'Sala de Bombagem - Nível 1', 'operacional', '2023-06-15', 5500.00, 'hours', 1240, true),
  ('20000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Bomba Centrífuga B', 'PUMP-002', 'BCF-200', 'Grundfos', 'SN-202204-002', 'Sala de Bombagem - Nível 2', 'operacional', '2023-08-20', 6800.00, 'hours', 890, false),

  -- Motores
  ('20000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Motor Principal 1', 'MOTOR-001', 'IE3 132S', 'Siemens', 'SN-202201-101', 'Centro de Controlo', 'operacional', '2022-03-10', 8900.00, 'hours', 3500, true),
  ('20000000-0000-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Motor Auxiliar 1', 'MOTOR-002', 'IE2 90S', 'ABB', 'SN-202206-102', 'Área de Produção', 'operacional', '2023-02-14', 3200.00, 'hours', 1100, false),

  -- Compressores
  ('20000000-0000-0000-0000-000000000005', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Compressor de Ar Principal', 'COMP-001', 'GA-11', 'Atlas Copco', 'SN-202201-201', 'Área de Compressores', 'operacional', '2021-11-05', 15000.00, 'hours', 6200, true),
  ('20000000-0000-0000-0000-000000000006', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Compressor Backup', 'COMP-002', 'LS-2.2', 'RotorComp', 'SN-202204-202', 'Área de Armazenamento', 'parado', '2023-09-10', 8500.00, 'hours', 450, false),

  -- Conversores
  ('20000000-0000-0000-0000-000000000007', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Conversor de Frequência 1', 'VFD-001', 'SINAMICS G120', 'Siemens', 'SN-202201-301', 'Quadro de Controlo', 'operacional', '2023-01-20', 4500.00, 'hours', 2100, true),

  -- Válvulas
  ('20000000-0000-0000-0000-000000000008', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Válvula de Controlo Principal', 'VALVE-001', 'NG6', 'Eaton', 'SN-202201-401', 'Sistema Hidráulico', 'operacional', '2022-07-15', 2200.00, NULL, NULL, false),

  -- Sensores
  ('20000000-0000-0000-0000-000000000009', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'Sensor de Temperatura T1', 'TEMP-001', 'PT100', 'Siemens', 'SN-202206-501', 'Zona de Aquecimento', 'operacional', '2023-05-02', 350.00, NULL, NULL, false),
  ('20000000-0000-0000-0000-000000000010', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'Sensor de Pressão P1', 'PRESS-001', '4-20mA', 'Wika', 'SN-202204-502', 'Linha de Entrada', 'operacional', '2023-06-10', 425.00, NULL, NULL, false),

  -- Transformadores
  ('20000000-0000-0000-0000-000000000011', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'Transformador Principal', 'TRANS-001', 'TR-630', 'Relmex', 'SN-202201-601', 'Subestação', 'operacional', '2020-09-18', 12500.00, 'hours', 8100, true),

  -- Ventiladores
  ('20000000-0000-0000-0000-000000000012', '550e8400-e29b-41d4-a716-446655440000', '0fab0000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'Ventilador de Arrefecimento 1', 'FAN-001', 'AXIAL-500', 'ebm-papst', 'SN-202203-701', 'Zona de Refrigeração', 'operacional', '2023-04-22', 1800.00, 'hours', 2300, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: INSERIR PLANOS DE MANUTENÇÃO
-- ============================================================================

INSERT INTO maintenance_plans (
  id,
  tenant_id,
  asset_id,
  name,
  description,
  type,
  frequency_type,
  frequency_value,
  meter_threshold,
  is_active
)
VALUES
  -- Bomba A - Manutenção Preventiva
  ('30000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000001', 'Inspecção Trimestral Bomba A', 'Limpeza, verificação de selagens e níveis de óleo', 'preventiva', 'days', 90, NULL, true),
  ('30000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000001', 'Revisão Anual Bomba A', 'Revisão completa com desmontagem parcial', 'preventiva', 'months', 12, NULL, true),
  ('30000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000001', 'Manutenção por Medidor - Bomba A', 'Manutenção quando atingir 1500 horas', 'preventiva', 'meter', 1500, 1500.00, true),

  -- Bomba B - Manutenção Preventiva
  ('30000000-0000-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000002', 'Inspecção Mensal Bomba B', 'Verificação de funcionamento e ruídos anormais', 'preventiva', 'days', 30, NULL, true),
  ('30000000-0000-0000-0000-000000000005', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000002', 'Revisão Semestral Bomba B', 'Revisão com substituição de vedações', 'preventiva', 'months', 6, NULL, true),

  -- Motor Principal 1 - Manutenção Preventiva
  ('30000000-0000-0000-0000-000000000006', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000003', 'Verificação Semanal Motor 1', 'Inspeção visual e teste de temperatura', 'preventiva', 'days', 7, NULL, true),
  ('30000000-0000-0000-0000-000000000007', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000003', 'Termo-análise Motor 1', 'Análise térmica para detetar anomalias', 'preventiva', 'months', 3, NULL, true),
  ('30000000-0000-0000-0000-000000000008', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000003', 'Revisão Anual Motor 1', 'Revisão completa do motor', 'preventiva', 'months', 12, NULL, true),

  -- Compressor Principal - Manutenção Preventiva
  ('30000000-0000-0000-0000-000000000009', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000005', 'Limpeza de Filtros Compressor', 'Limpeza e verificação de filtros de ar', 'preventiva', 'days', 15, NULL, true),
  ('30000000-0000-0000-0000-000000000010', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000005', 'Drenagem de Óleo Compressor', 'Drenagem e substituição de óleo de compressão', 'preventiva', 'months', 6, NULL, true),
  ('30000000-0000-0000-0000-000000000011', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000005', 'Inspeção Trimestral Compressor', 'Verificação de funcionamento e consumo energético', 'preventiva', 'months', 3, NULL, true),

  -- Conversor de Frequência - Manutenção Preventiva
  ('30000000-0000-0000-0000-000000000012', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000007', 'Teste de Funcionamento VFD', 'Teste de funcionamento e parâmetros', 'preventiva', 'months', 2, NULL, true),
  ('30000000-0000-0000-0000-000000000013', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000007', 'Limpeza de Dissipador VFD', 'Limpeza do dissipador de calor', 'preventiva', 'months', 6, NULL, true),

  -- Transformador - Manutenção Preventiva
  ('30000000-0000-0000-0000-000000000014', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000011', 'Análise de Óleo Transformador', 'Análise periódica do óleo de isolamento', 'preventiva', 'months', 12, NULL, true),
  ('30000000-0000-0000-0000-000000000015', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000011', 'Verificação de Arrefecimento', 'Verificação dos ventiladores de arrefecimento', 'preventiva', 'months', 3, NULL, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: VALIDAÇÃO E INFORMAÇÕES
-- ============================================================================

-- Contar registos criados
SELECT 
  (SELECT COUNT(*) FROM asset_categories WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000') as categorias,
  (SELECT COUNT(*) FROM assets WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000') as equipamentos,
  (SELECT COUNT(*) FROM maintenance_plans WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000') as planos_manutencao;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
--
-- 1. DADOS DE TESTE COMPLETOS:
--    ✓ 8 Categorias de Equipamentos
--    ✓ 12 Equipamentos (Assets)
--    ✓ 15 Planos de Manutenção
--
-- 2. TENANT ID UTILIZADO:
--    550e8400-e29b-41d4-a716-446655440000
--    (Bater com backend/src/config/constants.ts)
--
-- 3. PLANT ID UTILIZADO:
--    0fab0000-0000-0000-0000-000000000001
--    (Criado no create-admin-user.sql)
--
-- 4. ESTRUTURA DE DADOS:
--    - Categorias -> Assets -> Planos de Manutenção
--    - Relações referências (Foreign Keys) mantidas
--    - Dados realistas com fabricantes e modelos reais
--
-- 5. PRÓXIMOS PASSOS:
--    - Testar login com admin@cmms.com / Admin@123456
--    - Verificar se plantIds são carregados corretamente
--    - Visualizar assets e planos de manutenção
--
-- ============================================================================

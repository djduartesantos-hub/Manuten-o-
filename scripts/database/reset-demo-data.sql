-- ============================================================================
-- RESETAR DADOS DE DEMONSTRAÇÃO
-- ============================================================================
-- Script SQL para limpar dados de demonstração e recarregar
-- Use este script apenas se quiser resetar os dados demo
--
-- Versão: 1.0
-- Data: 2026-02-05
-- ============================================================================

-- ============================================================================
-- CONSTANTS: IDs padrão do sistema (single-tenant mode)
-- ============================================================================
-- Tenant ID: 550e8400-e29b-41d4-a716-446655440000
-- Plant ID: 0fab0000-0000-0000-0000-000000000001

-- ============================================================================
-- STEP 1: DELETAR DADOS EXISTENTES (em ordem reversa de constraints)
-- ============================================================================

-- Deletar Planos de Manutenção
DELETE FROM maintenance_plans 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND id LIKE '30000000-%';

-- Deletar Equipamentos (Assets)
DELETE FROM assets 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND id LIKE '20000000-%';

-- Deletar Categorias
DELETE FROM asset_categories 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND id LIKE '10000000-%';

-- ============================================================================
-- STEP 2: VERIFICAR DADOS DELETADOS
-- ============================================================================

SELECT 
  'Planos de Manutenção' as tipo,
  COUNT(*) as count_deleted
FROM maintenance_plans 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND id LIKE '30000000-%'

UNION ALL

SELECT 
  'Assets (Equipamentos)' as tipo,
  COUNT(*) as count_deleted
FROM assets 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND id LIKE '20000000-%'

UNION ALL

SELECT 
  'Categorias' as tipo,
  COUNT(*) as count_deleted
FROM asset_categories 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND id LIKE '10000000-%';

-- ============================================================================
-- RESULTADO ESPERADO APÓS RESET
-- ============================================================================
-- tipo                    | count_deleted
-- ----------------------+-------
-- Planos de Manutenção  |       0
-- Assets (Equipamentos) |       0
-- Categorias            |       0
--
-- Se os counts forem 0, confirma que todos os dados demo foram deletados.
-- Agora pode executar o demo-data.sql para recarregar dados novos.
-- ============================================================================

-- ============================================================================
-- FIX - Garantir que admin tem plantas
-- ============================================================================

-- Passo 1: Obter IDs reais do banco (em caso de conflito)
WITH admin AS (
  SELECT id FROM users WHERE email = 'admin@cmms.com' AND tenant_id = '550e8400-e29b-41d4-a716-446655440000'
),
plant_info AS (
  SELECT id FROM plants WHERE code = 'PLANT-001' AND tenant_id = '550e8400-e29b-41d4-a716-446655440000'
)
-- Passo 2: Deletar links antigos (se existem conflitos)
DELETE FROM user_plants 
WHERE user_id IN (SELECT id FROM admin)
AND plant_id IN (SELECT id FROM plant_info);

-- Passo 3: Inserir link correto com IDs reais
WITH admin AS (
  SELECT id FROM users WHERE email = 'admin@cmms.com' AND tenant_id = '550e8400-e29b-41d4-a716-446655440000'
),
plant_info AS (
  SELECT id FROM plants WHERE code = 'PLANT-001' AND tenant_id = '550e8400-e29b-41d4-a716-446655440000'
)
INSERT INTO user_plants (id, user_id, plant_id)
SELECT 
  gen_random_uuid(),
  admin.id,
  plant_info.id
FROM admin, plant_info
WHERE admin.id IS NOT NULL AND plant_info.id IS NOT NULL;

-- Verificar resultado
SELECT 'RESULTADO FINAL:' as status;
SELECT 
  u.id as user_id,
  u.email,
  COUNT(up.id) as num_plants,
  STRING_AGG(p.name, ', ') as plant_names
FROM users u
LEFT JOIN user_plants up ON u.id = up.user_id
LEFT JOIN plants p ON up.plant_id = p.id
WHERE u.email = 'admin@cmms.com'
GROUP BY u.id, u.email;

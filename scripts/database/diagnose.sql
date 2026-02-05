-- ============================================================================
-- DIAGNÓSTICO - Verificar se dados estão corretos
-- ============================================================================

-- 1. Verificar usuários
SELECT 'STEP 1: Usuários' as status;
SELECT id, email, role, is_active, tenant_id FROM users WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- 2. Verificar plantas
SELECT 'STEP 2: Plantas' as status;
SELECT id, name, code, tenant_id FROM plants WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- 3. Verificar relação user_plants
SELECT 'STEP 3: Relação User-Plants' as status;
SELECT up.id, up.user_id, up.plant_id, u.email, p.name 
FROM user_plants up
LEFT JOIN users u ON up.user_id = u.id
LEFT JOIN plants p ON up.plant_id = p.id
WHERE u.tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- 4. Verificar usuario admin especificamente
SELECT 'STEP 4: Usuário Admin + suas plantas' as status;
SELECT 
  u.id as user_id,
  u.email,
  u.role,
  COUNT(up.plant_id) as num_plants,
  STRING_AGG(p.name, ', ') as plant_names
FROM users u
LEFT JOIN user_plants up ON u.id = up.user_id
LEFT JOIN plants p ON up.plant_id = p.id
WHERE u.email = 'admin@cmms.com'
GROUP BY u.id, u.email, u.role;

-- 5. Verificar se há conflitos de UUIDs
SELECT 'STEP 5: Verificar UUIDs no banco' as status;
SELECT 'User Admin ID:', id FROM users WHERE email = 'admin@cmms.com';
SELECT 'Plant ID:', id FROM plants WHERE code = 'PLANT-001';
SELECT 'User-Plant IDs:', user_id, plant_id FROM user_plants WHERE user_id IN (SELECT id FROM users WHERE email = 'admin@cmms.com');

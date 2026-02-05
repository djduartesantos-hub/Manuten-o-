-- ============================================================================
-- FIX USER PLANTS - Garante que todos os usuários têm acesso a plantas
-- ============================================================================
-- Este script corrige o erro "Plant ID is required" ao garantir que todos
-- os usuários ativos tenham a relação user_plants criada.
--
-- Execução: psql -U cmms_user -d cmms_enterprise -h localhost -f fix-user-plants.sql
-- ============================================================================

-- Verificar usuários sem plantas
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  COUNT(up.id) as plants_count
FROM users u
LEFT JOIN user_plants up ON u.id = up.user_id
WHERE u.is_active = true
  AND u.deleted_at IS NULL
GROUP BY u.id, u.email, u.first_name, u.last_name, u.role
HAVING COUNT(up.id) = 0;

-- Linkar todos os usuários sem plantas à planta principal
-- (Funciona para superadmin e outros usuários)
INSERT INTO user_plants (id, user_id, plant_id)
SELECT 
  gen_random_uuid(),
  u.id,
  p.id
FROM users u
CROSS JOIN (
  SELECT id 
  FROM plants 
  WHERE is_active = true 
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
) p
LEFT JOIN user_plants up ON u.id = up.user_id AND up.plant_id = p.id
WHERE u.is_active = true
  AND u.deleted_at IS NULL
  AND up.id IS NULL  -- Apenas usuários que ainda não têm essa planta
ON CONFLICT DO NOTHING;

-- Verificar resultado
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  p.name as plant_name,
  p.code as plant_code
FROM users u
LEFT JOIN user_plants up ON u.id = up.user_id
LEFT JOIN plants p ON up.plant_id = p.id
WHERE u.is_active = true
  AND u.deleted_at IS NULL
ORDER BY u.email;

-- ============================================================================
-- INSTRUÇÕES APÓS EXECUTAR
-- ============================================================================
-- 1. Se o script executou com sucesso, você verá todos os usuários
--    vinculados a pelo menos uma planta.
--
-- 2. IMPORTANTE: Os usuários precisam fazer LOGOUT e LOGIN novamente
--    para que o novo token JWT seja gerado com os plantIds.
--
-- 3. Após o re-login, o erro "Plant ID is required" deve desaparecer.
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC SCRIPT: PLANT IDs AND USER/PLANT RELATIONSHIPS
-- ============================================================================

-- 1. PLANTS TABLE DATA
SELECT '=== PLANTS ===' as section;
SELECT id, tenant_id, code, name, is_active FROM plants;

-- 2. USERS TABLE DATA
SELECT '=== USERS ===' as section;
SELECT id, tenant_id, email, first_name, last_name, role, is_active FROM users;

-- 3. USER_PLANTS RELATIONSHIPS (DETAILED)
SELECT '=== USER_PLANTS (DETAILED) ===' as section;
SELECT 
  up.id AS user_plant_id,
  up.user_id,
  u.email AS user_email,
  u.role AS user_role,
  up.plant_id,
  p.code AS plant_code,
  p.name AS plant_name,
  p.tenant_id AS plant_tenant_id
FROM user_plants up
LEFT JOIN users u ON up.user_id = u.id
LEFT JOIN plants p ON up.plant_id = p.id
ORDER BY u.email, p.code;

-- 4. CHECK FOR USERS WITHOUT PLANTS
SELECT '=== USERS WITHOUT PLANTS ===' as section;
SELECT u.id, u.email, u.role
FROM users u
LEFT JOIN user_plants up ON u.id = up.user_id
WHERE up.id IS NULL;

-- 5. CHECK FOR ORPHANED PLANTS
SELECT '=== ORPHANED PLANTS (NO USERS) ===' as section;
SELECT p.id, p.code, p.name
FROM plants p
LEFT JOIN user_plants up ON p.id = up.plant_id
WHERE up.id IS NULL;

-- 6. COUNT SUMMARY
SELECT '=== COUNTS ===' as section;
SELECT 
  (SELECT COUNT(*) FROM plants) as plants_total,
  (SELECT COUNT(*) FROM users) as users_total,
  (SELECT COUNT(*) FROM user_plants) as user_plants_total,
  (SELECT COUNT(*) FROM users WHERE role = 'superadmin') as superadmin_count,
  (SELECT COUNT(*) FROM users WHERE role = 'tecnico') as tecnico_count;

-- 7. TENANT IDs IN DATABASE
SELECT '=== TENANT_IDs USED ===' as section;
SELECT DISTINCT tenant_id FROM plants
UNION
SELECT DISTINCT tenant_id FROM users;

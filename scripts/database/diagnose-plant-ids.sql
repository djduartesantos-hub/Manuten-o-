-- Diagnostic script to check plant IDs format

-- 1. Check plants table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'plants' 
  AND column_name IN ('id', 'tenant_id', 'code', 'name')
ORDER BY ordinal_position;

-- 2. Check actual plants in database
SELECT id, tenant_id, code, name FROM plants;

-- 3. Check user_plants relationships
SELECT up.user_id, up.plant_id, p.code, p.name 
FROM user_plants up
JOIN plants p ON up.plant_id = p.id;

-- 4. Check users and their plants
SELECT u.id, u.email, u.role, STRING_AGG(p.code || ' (' || p.name || ')', ', ') as plants
FROM users u
LEFT JOIN user_plants up ON u.id = up.user_id
LEFT JOIN plants p ON up.plant_id = p.id
GROUP BY u.id, u.email, u.role;

-- 5. Count records
SELECT 
  (SELECT COUNT(*) FROM plants) as plants_count,
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM user_plants) as user_plants_count;

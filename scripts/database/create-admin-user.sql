-- ============================================================================
-- CREATE ADMIN USER MANUALLY
-- ============================================================================
-- Use este script para criar um usuário admin manualmente no banco de dados
-- Útil quando o endpoint de inicialização não funciona ou para troubleshooting
--
-- Credenciais padrão:
--   Email: admin@cmms.com
--   Senha: Admin@123456
--
-- ============================================================================

-- Step 1: Criar planta padrão (se não existir)
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

-- Step 2: Criar usuário admin
-- Password hash: Admin@123456 (bcrypt com 10 rounds)
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

-- Step 3: Vincular user à planta
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
-- VERIFICAÇÃO: Confirmar que o user foi criado
-- ============================================================================
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
-- USAR OUTRA SENHA?
-- ============================================================================
-- Se quiser usar uma senha diferente, gere o hash bcrypt:
--
-- Node.js:
--   node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('SUA_SENHA', 10))"
--
-- Python:
--   python3 -c "import bcrypt; print(bcrypt.hashpw(b'SUA_SENHA', bcrypt.gensalt(10)).decode())"
--
-- Bash com openssl (menos seguro):
--   echo -n 'SUA_SENHA' | openssl passwd -1
--
-- Depois substitua o hash em password_hash no INSERT acima.
-- ============================================================================

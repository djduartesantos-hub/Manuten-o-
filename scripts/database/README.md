# 📊 Database Scripts - Manuten-o CMMS

Files e documentação para setup e management de database.

## 📋 Conteúdo

- **setup-database.sql** - Schema inicial (referência)
  - Tabelas base
  - Relações
  - Constraints

- **create-admin-user.sql** - Setup completo com usuário admin
  - Cria todas as tabelas
  - Cria tipos (enums)
  - Cria usuário admin padrão
  - Cria planta padrão
  - Vincula admin à planta

- **demo-data.sql** - Dados realistas de demonstração 🆕
  - 8 categorias de equipamentos
  - 12 equipamentos (assets) com informações realistas
  - 15 planos de manutenção
  - Requer: create-admin-user.sql já executado

- **diagnose.sql** - Script de diagnóstico
  - Verifica estado da database
  - Lista users, plants, assets, etc.

- **fix-admin-plants.sql** - Script de correção
  - Repara relações de plants para admin

---

## 🔧 Database Setup

### Opção 1: Automático (RECOMENDADO)
```bash
# Linux/Mac
../setup/setup-database.sh

# Windows
..\setup\setup-database.bat
```

### Opção 2: Manual com dados demo

#### Para PostgreSQL local:
```bash
# 1. Criar a database e schema
psql -U postgres -d postgres -f create-admin-user.sql

# 2. Conectar à database
psql -U cmms_user -d cmms_enterprise -h localhost

# 3. Carregar dados de demonstração
psql -U cmms_user -d cmms_enterprise -h localhost -f demo-data.sql
```

#### Para DBeaver ou GUI SQL:
```
1. Executar: create-admin-user.sql (cria schema + admin user)
2. Executar: demo-data.sql (carrega dados de teste)
3. Verificar: diagnose.sql (confirma dados)
```

#### Para Render ou produção:
```bash
# Vê: /docs/DEPLOYMENT/RENDER_GUIDE.md
```

---

## 📚 Migrations

Com Drizzle ORM (no backend):
```bash
cd backend
npm run db:migrate
npm run db:seed
```

---

## 🧪 Testar após setup

### Credenciais padrão:
- **Email:** admin@cmms.com
- **Senha:** Admin@123456
- **Role:** superadmin

### Verificar dados:
```bash
# Diagnosticar database
psql -U cmms_user -d cmms_enterprise -h localhost -f diagnose.sql

# Ou no DBeaver: Executar diagnose.sql
```

### Resultado esperado de demo-data.sql:
```
 categorias | equipamentos | planos_manutencao
 -----------+--------------+-------------------
          8 |           12 |                15
```

---

## 🐛 Troubleshooting

Se encontrar erros:

1. **"Plant ID is required"**
   - Executar: demo-data.sql para garantir que os dados estão carregados
   - Verificar: plantIds no JWT token (deve incluir plant IDs)

2. **Assets não aparecem**
   - Confirmar que demo-data.sql foi executado
   - Verificar tenant_id: `550e8400-e29b-41d4-a716-446655440000`
   - Verificar plant_id: `0fab0000-0000-0000-0000-000000000001`

3. **User não vinculado à planta**
   - Executar: fix-admin-plants.sql
   - Ou verificar user_plants table: 
   ```sql
   SELECT * FROM user_plants WHERE user_id = '00000001-0000-0000-0000-000000000001';
   ```

4. Vê [`/docs/GUIDES/TROUBLESHOOTING.md`](../../docs/GUIDES/TROUBLESHOOTING.md)

---

## 📖 Documentação

- **DATABASE_SETUP.md:** [`/docs/SETUP/DATABASE_SETUP.md`](../../docs/SETUP/DATABASE_SETUP.md)
- **PROJECT_STRUCTURE.md:** [`/docs/ARCHITECTURE/PROJECT_STRUCTURE.md`](../../docs/ARCHITECTURE/PROJECT_STRUCTURE.md)
- **WINDOWS_DATABASE_SETUP.md:** [`/docs/SETUP/WINDOWS_DATABASE_SETUP.md`](../../docs/SETUP/WINDOWS_DATABASE_SETUP.md)

---

## 💡 Notas

- **Tenant ID padrão:** `550e8400-e29b-41d4-a716-446655440000` (bater com `backend/src/config/constants.ts`)
- **Plant ID padrão:** `0fab0000-0000-0000-0000-000000000001`
- **Modo single-tenant:** Todos os dados usam o mesmo tenant ID
- **user_plants:** Tabela que vincula users aos plants (essencial para plantIds)


# 🚀 Setup Database com Dados de Demonstração

Este documento descreve como criar a database completa do CMMS com dados realísticos de teste.

---

## ⚡ Quick Start (Recomendado)

### Linux / Mac

```bash
# Tornar o script executável (primeira vez)
chmod +x scripts/database/setup-demo.sh

# Executar
./scripts/database/setup-demo.sh
```

### Windows

```bash
# Double-click em scripts\database\setup-demo.bat
# Ou no terminal:
scripts\database\setup-demo.bat
```

**Resultado esperado:**
```
[1/3] A criar database e schema...         ✓ OK
[2/3] A carregar dados de demonstração...  ✓ OK
[3/3] A verificar dados carregados...      ✓ OK

Dados verificados:
  - Categorias: 8
  - Equipamentos: 12
  - Planos de Manutenção: 15

✓ SETUP CONCLUÍDO COM SUCESSO!
```

---

## 📋 O que é criado

### 1. **Database e User**
```sql
-- User: cmms_user
-- Database: cmms_enterprise
-- Password: cmms_password (padrão)
```

### 2. **All Tabelas** (Schema completo)
- ✓ plants, users, user_plants
- ✓ assets, asset_categories
- ✓ maintenance_plans, maintenance_tasks
- ✓ work_orders, spare_parts, stock_movements
- ✓ E muitas mais...

### 3. **Dados de Demonstração** 🆕
- ✓ 1 Planta: "Fábrica Principal"
- ✓ 1 Superadmin User: superadmin@cmms.com / SuperAdmin@123456
- ✓ 8 Categorias de equipamentos
- ✓ 12 Equipamentos realistas (com fabricantes reais)
- ✓ 15 Planos de Manutenção variados

---

## 🔧 Passo a Passo Manual

Se o script não funcionar ou preferir fazer manualmente:

### 1. Abra um terminal/command prompt

```bash
# Linux/Mac
sudo -u postgres psql

# Windows (em PowerShell comoAdmin)
psql -U postgres
```

### 2. Copie e execute o ficheiro `create-admin-user.sql`

**Opção A: Via ficheiro**
```bash
\i 'path/to/scripts/database/create-admin-user.sql'
```

**Opção B: Copy-paste todo o conteúdo**

### 3. Saia do prompt postgres

```sql
\q
```

### 4. Conecte como novo utilizador

```bash
psql -U cmms_user -d cmms_enterprise -h localhost
```

### 5. Carregue os dados de demonstração

```sql
\i 'path/to/scripts/database/demo-data.sql'
```

### 6. Verifique os dados

```sql
\i 'path/to/scripts/database/diagnose.sql'
```

---

## 🧪 Testar após setup

### 1. Iniciar o Backend

```bash
cd backend
npm install
npm run dev
```

Deve aparecer:
```
✓ Connected to database
✓ Socket server running on port 3000
Server running on port 3000
```

### 2. Iniciar o Frontend

```bash
cd frontend
npm install
npm run dev
```

Deve aparecer:
```
VITE ...
➜ Local: http://localhost:5173/
```

### 3. Fazer Login

1. Aceda a http://localhost:5173/t/demo/login
2. Insira:
   - **Email:** superadmin@cmms.com
   - **Senha:** SuperAdmin@123456
3. Clique em "Entrar"

### 4. Testar as Funcionalidades

#### ✓ Verificar Equipamentos
1. Menu → "Equipamentos"
2. Deve mostrar os 12 equipamentos
3. Clique num equipamento para ver detalhes

#### ✓ Verificar Planos de Manutenção
1. Menu → "Planos de Manutenção"
2. Deve mostrar os 15 planos
3. Clique num plano para ver detalhes
4. Confirme o SELECT corrigido funciona

#### ✓ Verificar Dados Carregados
1. Abra a consola do browser (F12)
2. Vá à aba "Network" 
3. Clique em "Equipamentos"
4. Procure por `/api/t/*/assets`
5. A resposta deve incluir `"success": true` com 12 equipamentos

---

## 📊 Estrutura dos Dados Demo

### Plantas
```
ID: 0fab0000-0000-0000-0000-000000000001
Nome: Fábrica Principal
Código: PLANT-001
Localização: Lisboa, Portugal
```

### Categorias de Equipamentos
```
1. Bombas
2. Motores
3. Compressores
4. Conversores
5. Válvulas
6. Sensores
7. Transformadores
8. Ventiladores
```

### Equipamentos (Exemplo)
```
Código: PUMP-001
Nome: Bomba Centrífuga A
Fabricante: KSB
Modelo: BCF-150
Localização: Sala de Bombagem - Nível 1
Status: Operacional
Horas: 1240
Crítico: Sim
Categoria: Bombas
```

### Planos de Manutenção (Exemplo)
```
Nome: Inspecção Trimestral Bomba A
Tipo: Preventiva
Frequência: 90 dias
Descrição: Limpeza, verificação de selagens e níveis de óleo
Ativo: Sim
```

---

## 🐛 Troubleshooting

### Problema: "Plant ID is required"

**Solução:**
1. Confirme que `demo-data.sql` foi executado
2. Verifique se o utilizador está vinculado à planta:
   ```sql
   SELECT * FROM user_plants WHERE user_id = '00000001-0000-0000-0000-000000000001';
   ```
3. Se não existir, execute `fix-admin-plants.sql`
4. Faça logout e login novamente

### Problema: Assets não aparecem

**Solução:**
1. Confirme os dados foram carregados:
   ```sql
   SELECT COUNT(*) FROM assets WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
   ```
2. Deve retornar 12
3. Se retornar 0, execute `demo-data.sql` novamente

### Problema: "Database does not exist"

**Solução:**
1. Execute `create-admin-user.sql` completo
2. Verifique se a senha está correta:
   ```bash
   psql -U cmms_user -d cmms_enterprise -W
   ```
3. Se errro "invalid password", recrie o user:
   ```sql
   DROP USER IF EXISTS cmms_user;
   CREATE USER cmms_user WITH PASSWORD 'cmms_password';
   ```

### Problema: psql não encontrado

**Solução:**

**Linux/Mac:**
```bash
# Instalar PostgreSQL
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Mac
brew install postgresql
```

**Windows:**
1. Descarregue PostgreSQL: https://www.postgresql.org/download/windows/
2. Descomprima
3. Procure `psql.exe` nos ficheiros
4. Adicione o caminho ao PATH (Variáveis de Ambiente)

---

## 📈 Dados que VOCÊ pode Adicionar

Após o setup inicial, pode adicionar mais dados manualmente:

### Adicionar novo Equipamento

1. Menu → "Equipamentos"
2. Clique em "Novo Equipamento"
3. Preencha:
   - Código: PUMP-003
   - Nome: Bomba Centrífuga C
   - Categoria: Bombas
   - Etc.
4. Clique "Guardar"

### Adicionar novo Plano de Manutenção

1. Menu → "Planos de Manutenção"
2. Clique em "Novo Plano"
3. Preencha:
   - Nome: Revisão Anual Bomba C
   - Equipamento: Bomba Centrífuga C
   - Tipo: Preventiva
   - Frequência: 12 meses
4. Clique "Guardar"

---

## 📖 Ficheiros Relacionados

- **create-admin-user.sql** - Schema completo + usuário admin
- **demo-data.sql** - Dados de demonstração (novo)
- **setup-demo.sh** - Script automático Linux/Mac (novo)
- **setup-demo.bat** - Script automático Windows (novo)
- **diagnose.sql** - Script de diagnóstico
- **fix-admin-plants.sql** - Script de reparo

---

## 💡 Notas Importantes

### IDs Padrão
```
Tenant ID: 550e8400-e29b-41d4-a716-446655440000
Plant ID: 0fab0000-0000-0000-0000-000000000001
Admin Empresa User ID: 00000001-0000-0000-0000-000000000001
Superadmin User ID: 00000001-0000-0000-0000-000000000006
```

### Credenciais
```
Email: superadmin@cmms.com
Senha: SuperAdmin@123456
Papel: superadmin
```

### Banco de Dados
```
Utilizador: cmms_user
Password: cmms_password
Database: cmms_enterprise
Host: localhost
Porto: 5432 (padrão PostgreSQL)
```

### Modo Single-Tenant
- Sistema configurado para 1 tenant padrão
- Todos os dados usam o mesmo tenant ID
- Pode ser alterado em `backend/src/config/constants.ts`

---

## 🎯 Próximos Passos

1. ✓ Executar `setup-demo.sh` ou `setup-demo.bat`
2. ✓ Iniciar backend: `npm run dev` em `backend/`
3. ✓ Iniciar frontend: `npm run dev` em `frontend/`
4. ✓ Fazer login com superadmin@cmms.com
5. ✓ Verificar dados carregados
6. ✓ Testar criação de planos de manutenção
7. ✓ Testar criação de ordens de trabalho

---

**Sucesso! Database pronta para teste.** 🎉

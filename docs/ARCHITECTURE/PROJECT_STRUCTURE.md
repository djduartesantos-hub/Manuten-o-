# CMMS Enterprise - Estrutura Completa do Projeto

## 📦 Árvore de Ficheiros

```
cmms-enterprise/
│
├── README.md                           # Documentação principal
├── DEVELOPMENT.md                      # Guia de desenvolvimento
├── init.sh                             # Script de inicialização
│
├── backend/
│   ├── src/
│   │   ├── app.ts                      # Express app factory
│   │   ├── server.ts                   # Entry point
│   │   │
│   │   ├── auth/
│   │   │   └── jwt.ts                  # JWT utilities & hashing
│   │   │
│   │   ├── config/
│   │   │   ├── database.ts             # Drizzle setup
│   │   │   └── logger.ts               # Winston logger
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts      # Auth endpoints
│   │   │   ├── dashboard.controller.ts # Dashboard endpoints
│   │   │   └── workorder.controller.ts # Work order endpoints
│   │   │
│   │   ├── db/
│   │   │   ├── schema.ts               # Complete database schema
│   │   │   ├── seed.ts                 # Database seeding
│   │   │   └── migrations/             # (Future migrations)
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.ts                 # JWT & RBAC middleware
│   │   │   └── error.ts                # Error handling
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts          # Auth routes
│   │   │   ├── workorder.routes.ts     # Work order routes
│   │   │   └── dashboard.routes.ts     # Dashboard routes
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts         # Auth business logic
│   │   │   ├── tenant.service.ts       # Tenant/plant logic
│   │   │   └── workorder.service.ts    # Work order logic
│   │   │
│   │   ├── types/
│   │   │   ├── index.ts                # Main types
│   │   │   └── pg.d.ts                 # pg type definitions
│   │   │
│   │   └── utils/                      # (Utilities - placeholder)
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx           # Login/authentication
│   │   │   ├── DashboardPage.tsx       # Main dashboard
│   │   │   ├── WorkOrdersPage.tsx      # Work orders (stub)
│   │   │   └── AssetsPage.tsx          # Assets (stub)
│   │   │
│   │   ├── components/
│   │   │   ├── Header.tsx              # App header/nav
│   │   │   └── ProtectedRoute.tsx      # Route protection
│   │   │
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx          # Main app layout
│   │   │
│   │   ├── hooks/
│   │   │   └── useAuth.ts              # Auth hook
│   │   │
│   │   ├── context/
│   │   │   └── store.ts                # Zustand stores
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                  # API client
│   │   │
│   │   ├── App.tsx                     # Root component
│   │   ├── main.tsx                    # Entry point
│   │   └── index.css                   # Tailwind styles
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite-env.d.ts
│   ├── package.json
│   ├── .gitignore
│   └── README.md
│
└── .git/                               # Git repository
```

## 🗄️ Modelo de Dados (Banco PostgreSQL)

### Tabelas Implementadas

#### 1. **tenants** (Empresas)
- `id` - UUID primary key
- `name` - Nome da empresa
- `slug` - URL-safe identifier
- `description` - Descrição
- `logo_url` - Logo da empresa
- `subscription_plan` - Plano de subscrição
- `is_active` - Status
- `created_at`, `updated_at`, `deleted_at` - Timestamps

#### 2. **plants** (Fábricas)
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants
- `name` - Nome da fábrica
- `code` - Código único por tenant
- `address`, `city`, `country` - Localização
- `latitude`, `longitude` - Coordenadas GPS
- `is_active` - Status
- Timestamps soft-delete

#### 3. **users** (Utilizadores)
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants
- `email` - Unique per tenant
- `password_hash` - Bcrypt hash
- `first_name`, `last_name`
- `phone`
- `role` - 'superadmin', 'admin_empresa', 'gestor_manutencao', 'supervisor', 'tecnico', 'operador'
- `is_active`, `last_login`
- Timestamps soft-delete

#### 4. **user_plants** (Atribuição Utilizadores → Fábricas)
- N:N relationship
- `user_id` - Foreign key
- `plant_id` - Foreign key
- Composite unique index

#### 5. **asset_categories** (Categorias de Equipamentos)
- `id`, `tenant_id`
- `name`, `description`
- Timestamps

#### 6. **assets** (Equipamentos)
- `id`, `tenant_id`, `plant_id`
- `category_id` - Foreign key
- `name`, `code`, `model`, `manufacturer`, `serial_number`
- `qr_code` - Código QR único
- `location` - Localização na fábrica
- `status` - 'operacional', etc
- `acquisition_date`, `acquisition_cost`
- `meter_type` - 'hours', 'km', 'cycles'
- `current_meter_value`
- `is_critical` - Flag para críticos
- Timestamps soft-delete

#### 7. **maintenance_plans** (Planos de Manutenção)
- `id`, `tenant_id`, `asset_id`
- `name`, `description`
- `type` - 'preventiva' ou 'corretiva'
- `frequency_type` - 'days', 'months', 'meter'
- `frequency_value` - Valor numérico
- `meter_threshold` - Para planos por contador
- `is_active`
- Timestamps

#### 8. **maintenance_tasks** (Checklists das Manutenções)
- `id`, `tenant_id`, `plan_id`
- `description`
- `sequence` - Ordem
- Timestamps

#### 9. **work_orders** (Ordens de Trabalho)
- `id`, `tenant_id`, `plant_id`, `asset_id`
- `plan_id` - Opcional (pode ser manual)
- `assigned_to` - Foreign key to users
- `created_by` - Foreign key to users
- `title`, `description`
- `status` - 'aberta', 'atribuida', 'em_curso', 'concluida', 'cancelada'
- `priority` - 'baixa', 'media', 'alta', 'critica'
- `scheduled_date`, `started_at`, `completed_at`
- `estimated_hours`, `actual_hours`
- `notes`
- `sla_deadline`
- Timestamps

#### 10. **work_order_tasks** (Tarefas das Ordens)
- `id`, `work_order_id`, `task_id` (opcional)
- `description`
- `is_completed`, `completed_at`
- `notes`, `sequence`

#### 11. **spare_parts** (Peças Sobressalentes)
- `id`, `tenant_id`
- `code` - Unique per tenant
- `name`, `description`
- `unit_cost`
- `supplier_id`
- Timestamps

#### 12. **stock_movements** (Movimentos de Stock)
- `id`, `tenant_id`, `plant_id`
- `spare_part_id`, `work_order_id` (opcional)
- `type` - 'entrada', 'saida', 'ajuste'
- `quantity`, `unit_cost`, `total_cost`
- `notes`, `created_by`
- Timestamps

#### 13. **suppliers** (Fornecedores)
- `id`, `tenant_id`
- `name`, `email`, `phone`
- `address`, `city`, `country`
- Timestamps

#### 14. **meter_readings** (Leituras de Contadores)
- `id`, `tenant_id`, `asset_id`
- `reading_value`
- `reading_date`
- `recorded_by`
- `notes`
- Timestamps

#### 15. **attachments** (Fotos/Documentos)
- `id`, `tenant_id`, `work_order_id`
- `file_url`, `file_name`, `file_type`, `file_size`
- `uploaded_by`
- Timestamps

#### 16. **audit_logs** (Auditoria)
- `id`, `tenant_id`, `user_id`
- `action`, `entity_type`, `entity_id`
- `old_values`, `new_values` (JSON)
- `ip_address`
- Timestamps

#### 17. **sla_rules** (Regras de SLA)
- `id`, `tenant_id`
- `priority`
- `response_time_hours`, `resolution_time_hours`
- `is_active`
- Timestamps

## 🔑 Endpoints da API

### Autenticação

```
POST   /api/t/:tenantSlug/auth/login
POST   /api/t/:tenantSlug/auth/refresh
```

### Work Orders

```
GET    /api/t/:tenantSlug/work-orders
POST   /api/t/:tenantSlug/work-orders
GET    /api/t/:tenantSlug/work-orders/:workOrderId
PUT    /api/t/:tenantSlug/work-orders/:workOrderId
```

### Dashboard

```
GET    /api/t/:tenantSlug/dashboard/metrics
GET    /api/t/:tenantSlug/dashboard/kpis
```

## 👥 Roles & Permissões

| Role | Descrição | Acesso |
|------|-----------|--------|
| `superadmin` | Admin Global | Tudo em todas as empresas |
| `admin_empresa` | Admin da Empresa | Tudo da sua empresa |
| `gestor_manutencao` | Gestor | Manutenção da sua empresa |
| `supervisor` | Supervisor | Supervisão |
| `tecnico` | Técnico | Ordens atribuídas |
| `operador` | Operador | Regista/atualiza ordens |

## 🔐 Segurança

- ✅ JWT com refresh tokens
- ✅ Bcrypt para passwords
- ✅ Tenant isolation obrigatória
- ✅ RBAC em todas as rotas
- ✅ Middleware de tenant + plant
- ✅ Soft deletes (RGPD)
- ✅ Audit logs de ações críticas

## 📦 Dependências Principais

### Backend
- Express 4.18
- Drizzle ORM 0.28
- PostgreSQL driver (pg)
- JWT + Bcrypt
- Morgan (logging)
- Winston (logger)
- Zod (validação - placeholder)

### Frontend
- React 18
- Vite 4
- TailwindCSS 3
- Zustand (state)
- React Router
- Lucide Icons

## 🚀 Como Começar

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env com DATABASE_URL
npm run dev
```

Servidor em: `http://localhost:3000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App em: `http://localhost:5173`

### 3. Credenciais Demo

- Empresa: `demo`
- Email: `superadmin@cmms.com`
- Senha: `SuperAdmin@123456`

## 📊 Funcionalidades Implementadas

### ✅ Pronto

- [x] Setup inicial do projeto
- [x] Database schema completo
- [x] JWT autenticação
- [x] RBAC middleware
- [x] Tenant isolation
- [x] Login page
- [x] Dashboard com métricas
- [x] Work order CRUD (básico)
- [x] TypeScript full-stack

### 🔄 Em Desenvolvimento

- [ ] Seed de dados mais completo
- [ ] Validação com Zod
- [ ] Endpoints de assets
- [ ] Endpoints de maintenance plans
- [ ] Upload de ficheiros
- [ ] Notificações
- [ ] Integração PWA
- [ ] Testes (Jest/Vitest)

### ⏳ Roadmap

- [ ] App mobile
- [ ] Notificações em tempo real (WebSocket)
- [ ] Analytics avançadas
- [ ] Integração com SAP/ERP
- [ ] ML para previsão
- [ ] Offline-first

## 🧪 Verificações de Qualidade

### Backend
```bash
npm run type-check  # ✅ Passa
npm run lint        # Ready
npm run build       # Ready
```

### Frontend
```bash
npm run type-check  # ✅ Passa
npm run lint        # Ready
npm run build       # Ready
```

## 📝 Notas de Implementação

- **Database**: PostgreSQL com Drizzle ORM (simples e type-safe)
- **Auth**: JWT com access + refresh tokens
- **Isolamento**: Tenant ID em todas as queries
- **Soft Deletes**: RGPD compliance
- **Migrations**: Usar `drizzle-kit` quando necessário
- **Frontend**: React + Tailwind + Zustand (minimal mas poderoso)

## 🎯 Próximos Passos

1. ✅ Setup inicial ← **CONCLUÍDO**
2. Implementar seed de dados realista
3. Criar endpoints de assets
4. Implementar upload de ficheiros
5. Validação completa com Zod
6. Testes unitários e E2E
7. Deploy em Render/Railway
8. Documentação Swagger

---

**Última atualização**: 27 Jan 2026
**Status**: 🟢 Pronto para desenvolvimento

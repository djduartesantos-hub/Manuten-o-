# 🏭 CMMS Enterprise - Computerized Maintenance Management System

**Plataforma SaaS Enterprise de Gestão de Manutenção Computadorizada**

Ao nível de: **Infraspeak**, **ManWinWin**, **Fracttal One**

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-1.2.1-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)

---

## 🪟 Setup Rápido no Windows

**Novo! Instalação automática em 3 passos:**

1. Execute: `setup-windows.bat`
2. Configure: `backend\.env` (credenciais PostgreSQL)
3. Inicie: `start-all.bat`

Nota: o `setup-windows.ps1` agora tenta instalar o Node.js LTS via `winget` se estiver ausente, e usa `npm ci` quando existir `package-lock.json`. Execute `setup-windows.bat` para invocar o PowerShell automaticamente.

👉 [**QUICKSTART_WINDOWS.md**](./QUICKSTART_WINDOWS.md) - Guia rápido (2 min)  
📖 [**WINDOWS_SETUP.md**](./WINDOWS_SETUP.md) - Guia completo  
🆘 [**WINDOWS_TROUBLESHOOTING.md**](./WINDOWS_TROUBLESHOOTING.md) - Resolvendo problemas  
🎮 [**start-menu.bat**](./start-menu.bat) - Painel de controle interativo  

---

## 📋 Índice Rápido

- [Visão Geral](#visão-geral)
- [Setup Windows](#-setup-rápido-no-windows) ⭐ NEW
- [Sistema de Versionamento](#-sistema-de-versionamento)
- [Roadmap Desenvolvimento](#roadmap-desenvolvimento)
- [Novas Ideias](#-novas-ideias-de-desenvolvimento)
- [Características](#características-principais)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [APIs Disponíveis](#apis-disponíveis)
- [Funcionalidades](#funcionalidades)
- [Deployment](#deployment)
- [Segurança](#segurança)

---

## 🎯 Visão Geral

**CMMS Enterprise** é uma plataforma de gestão de manutenção robusta, escalável e pronta para produção que permite às empresas:

✅ Gerir manutenção preventiva e corretiva em múltiplas fábricas  
✅ Controlar equipamentos e ativos com rastreamento completo  
✅ Otimizar recursos com ordens de trabalho inteligentes  
✅ Acompanhar KPIs em tempo real (MTTR, MTBF, Disponibilidade)  
✅ Manter conformidade RGPD com auditoria total  
✅ Escalar para múltiplas empresas com isolamento de dados  

**Status Atual:** Phase 2 (Maintenance Planning & Spare Parts) ✅ Completa | Veja [PHASE_1_COMPLETION.md](./PHASE_1_COMPLETION.md)

---

## 🔢 Sistema de Versionamento

Veja documentação completa em [VERSIONING.md](./VERSIONING.md)

### Estrutura de Versão

```
X.Y.Z
│ │ └─ Número de correção/patch durante a phase
│ └─── Número da phase
└───── Versão major (sempre 1)
```

**Exemplos:**
- **v1.1.0** = Phase 1 Completa (Asset Management)
- **v1.1.1-1.1.9** = Correções/Melhorias Phase 1
- **v1.2.0** = Phase 2 Completa (Maintenance Planning) ← ATUAL
- **v1.2.1-1.2.9** = Correções/Melhorias Phase 2
- **v1.3.0** = Phase 3 Completa (Escalabilidade)
- **v1.4.0** = Phase 4 Completa (Produção)
- **v1.5.0** = Phase 5 Completa (IA & Analytics)

---

## 🚀 Roadmap Desenvolvimento

### ✅ Phase 1: Asset Management (COMPLETO - v1.0.0)
**Data:** Dezembro 2025 - Janeiro 2026  
**Status:** ✅ Production Ready

Gestão completa de ativos com:
- 6 CRUD endpoints para equipamentos
- Categorias e subcategorias
- Números de série e QR codes
- Rastreamento de contadores (horas/km)
- Integração com ordens de trabalho

**Commits:** 023b8b6, ef45292, 6cf42a9

---

### ✅ Phase 2: Maintenance Planning & Spare Parts (COMPLETO - v1.1.0)
**Data:** Janeiro 2026  
**Status:** ✅ Production Ready

Planeamento de manutenção preventiva com:
- 9 endpoints para planos de manutenção
- 12+ endpoints para gestão de peças sobressalentes
- Cálculo automático de manutenção vencida
- Gestão de stock por planta
- Movimentos de stock (entrada/saída/ajuste)
- Integração com fornecedores

**Commits:** 0be699a, cef311b

---

### 📋 Phase 3: Escalabilidade & Performance (POR INICIAR - 2-3 semanas)
**Funcionalidades Planeadas:**
- ⚡ **WebSocket** para notificações em tempo real
- 🔴 **Redis** para cache e sessões
- 🔍 **Elasticsearch** para busca avançada
- 📮 **Bull Job Queue** para processamento assíncrono
- 📊 **Performance Metrics** e monitoring

---

### 🔐 Phase 4: Produção & Conformidade (POR INICIAR - 1 semana)
**Funcionalidades Planeadas:**
- 🛡️ **Helmet** para segurança HTTP
- 🚦 **Rate Limiting** e throttling
- 📖 **Swagger/OpenAPI** documentation
- 🔔 **Sentry** para error tracking
- 🔄 **CI/CD Setup** com GitHub Actions

---

### 🤖 Phase 5: Análise Avançada & IA (POR INICIAR)
**Funcionalidades Planeadas:**
- 📈 Análise preditiva de falhas
- 🗺️ Otimização de rotas de manutenção
- 💰 Análise de custos e ROI
- 🎯 Recomendações inteligentes
- 📊 Dashboard de análise avançada

---

## 💡 Novas Ideias de Desenvolvimento

### Curto Prazo (1-2 meses)

**1. Dashboard Customizável por Utilizador** ⭐⭐
- Drag-and-drop para reorganizar widgets
- Múltiplos layouts salvos
- Preferências por role
- **ROI:** Alto | **Esforço:** Médio

**2. Relatórios Agendados por Email** ⭐⭐
- Templates de relatório (semanal, mensal, anual)
- Seleção de destinatários por role
- Anexos em PDF
- **ROI:** Alto | **Esforço:** Médio

**3. Mobile App com React Native** ⭐⭐⭐
- Acesso em tempo real
- Notificações push
- Offline mode
- **ROI:** Muito Alto | **Esforço:** Alto

**4. Integração com IoT Sensors** ⭐⭐⭐
- Leitura de sensores em tempo real
- Alertas automáticos
- Histórico de métricas
- **ROI:** Muito Alto | **Esforço:** Alto

**5. Análise Predictiva de Falhas** ⭐⭐⭐
- Machine Learning para predição
- Alertas preventivos
- Otimização de manutenção
- **ROI:** Muito Alto | **Esforço:** Alto

### Médio Prazo (3-4 meses)

**6. Integração com ERP Systems** ⭐⭐⭐
- SAP, Microsoft Dynamics, Oracle
- Sincronização de dados
- **ROI:** Muito Alto | **Esforço:** Alto

**7. Sistema de Documentação Integrado** ⭐⭐
- Manuais técnicos
- Procedimentos passo-a-passo
- Histórico de alterações
- **ROI:** Médio | **Esforço:** Médio

**8. Gestão de Contratos e Garantias** ⭐⭐
- Rastreamento de garantias
- Alertas de renovação
- Análise de custos
- **ROI:** Médio | **Esforço:** Médio

**9. Portal do Utilizador (Self-Service)** ⭐⭐⭐
- Submissão de requisições
- Acompanhamento de status
- Feedback e avaliações
- **ROI:** Alto | **Esforço:** Médio

**10. Sistema de Training & Compliance** ⭐⭐
- Cursos online
- Certificações
- Tracking de conclusão
- **ROI:** Médio | **Esforço:** Médio

### Longo Prazo (6+ meses)

**11. Gamification & Incentivos** ⭐⭐
- Badges e achievements
- Leaderboards
- Recompensas
- **ROI:** Médio | **Esforço:** Médio

**12. Supply Chain Management** ⭐⭐⭐
- Gestão de inventário
- Reordering automático
- Fornecedores e negociações
- **ROI:** Muito Alto | **Esforço:** Alto

**13. Conformidade e Regulação** ⭐⭐⭐
- ISO compliance tracking
- Auditoria integrada
- Documentação automática
- **ROI:** Alto | **Esforço:** Alto

**14. Energy Management & Sustainability** ⭐⭐
- Monitorização de consumo
- Relatórios de emissão
- Otimizações sustentáveis
- **ROI:** Médio | **Esforço:** Médio

**15. Marketplace de Integrações** ⭐⭐⭐
- API marketplace
- Extensões de terceiros
- Plugins community-driven
- **ROI:** Muito Alto | **Esforço:** Muito Alto

---

## ⭐ Características Principais

### 🔐 Segurança Enterprise
- JWT Authentication com Access + Refresh Tokens
- Bcrypt Password Hashing (10 rounds)
- RBAC com 6 roles customizáveis
- Multi-tenant Isolation forçada
- CORS Protection + Audit Logging
- Soft Deletes para conformidade RGPD

### 🏢 Multi-Tenancy Completa
- Isolamento total de dados por empresa
- Múltiplas fábricas por empresa
- Atribuição granular de utilizadores a plantas
- Contexto tenant obrigatório em todas as operações

### 📊 Dashboard com KPIs
- Métricas em tempo real (Total, Em Progresso, Concluídas, Backlog)
- 5 KPIs calculados automaticamente
- Status breakdown por tipo de ordem
- Interface responsiva mobile-first

### 🛠️ Gestão Completa de Manutenção
- **Ordens de Trabalho** com 5 estados (Aberta, Atribuída, Em Curso, Concluída, Cancelada)
- **Manutenção Preventiva** por tempo ou contador
- **Checklists** de tarefas por ordem
- **Anexos** para fotos e documentação

### 📦 Gestão de Ativos & Stock
- Cadastro de equipamentos com categorias ✨ **[Phase 1 - NOVO]**
- Números de série e QR codes
- Leituras de contadores (horas/km)
- Peças sobressalentes com controle de stock
- Fornecedores com histórico
- **Endpoints Assets:** 6 novos endpoints (criar, ler, atualizar, eliminar, buscar, manutenção)
- **Validação:** Zod schemas com validação completa
- **Segurança:** Isolamento tenant em todas operações

### 👥 Gestão de Utilizadores
**6 Roles Predefinidos:**
1. **SuperAdmin** - Acesso total
2. **AdminEmpresa** - Gestor da empresa
3. **GestorManutencao** - Supervisor
4. **Supervisor** - Gestor de turno
5. **Tecnico** - Executa ordens
6. **Leitor** - Visualização apenas

---

## 🚀 Stack Tecnológico

### Backend
```
Node.js 18+          Runtime
Express 4.18         Web Framework
TypeScript 5.2       Linguagem (strict mode)
PostgreSQL 14+       Banco de Dados
Drizzle ORM 0.28     Database Mapper (type-safe)
JWT 9.0              Autenticação
Bcrypt 5.1           Hashing
Winston 3.10         Logging estruturado
Morgan 1.10          HTTP Logging
Zod 3.21             Validação schemas ✨ **[Phase 1]**
```

### Frontend
```
React 18.2           UI Framework
TypeScript 5.2       Linguagem (strict mode)
Vite 4.5             Build Tool (sub-segundo)
TailwindCSS 3.3      Styling (utility-first)
React Router 6.20    Roteamento
Zustand 4.4          State Management
Lucide React 0.292   Ícones premium
Axios 1.6            HTTP Client
```

### DevOps & Deployment
```
Git & GitHub         Versionamento
npm                  Package Manager
Render               Hosting (recomendado)
Docker               Containerização (preparado)
PostgreSQL Cloud     Base de dados
```

---

## 📥 Instalação

### Quick Start (Automático)

```bash
# Clone o repositório
git clone https://github.com/djduartesantos-hub/Manuten-o-.git
cd Manuten-o-

# Execute script de inicialização
chmod +x init.sh
./init.sh

# Pronto! Siga as instruções finais
```

### Instalação Manual

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env com suas configurações
npm run type-check   # Validar TypeScript
npm run dev          # Iniciar servidor
```

#### Frontend
```bash
cd ../frontend
npm install
npm run dev          # Iniciar Vite dev server
```

#### Acesso
```
Frontend:  http://localhost:5173
Backend:   http://localhost:3000
API:       http://localhost:3000/api
```

---

## ⚙️ Configuração

### Backend - .env

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cmms_db

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=seu-secret-super-seguro-minimo-32-caracteres
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

### Render Environment

```env
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=seu-secret-seguro-32-chars
CORS_ORIGIN=https://seu-frontend.onrender.com
NODE_ENV=production

# Frontend
VITE_API_URL=https://seu-backend.onrender.com/api
```

---

## 📖 APIs Disponíveis

### Autenticação

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@cmms.com",
  "password": "Admin@123456",
  "tenant_id": "cmms-demo"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "admin@cmms.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "SuperAdmin",
      "tenantId": "cmms-demo"
    }
  }
}
```

#### Refresh Token
```bash
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

### Dashboard

#### Métricas
```bash
GET /api/dashboard/{plantId}/metrics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total_orders": 42,
    "open_orders": 5,
    "assigned_orders": 8,
    "in_progress": 12,
    "completed": 15,
    "cancelled": 2
  }
}
```

#### KPIs
```bash
GET /api/dashboard/{plantId}/kpis
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "mttr": "2.5",        # Tempo médio de reparação (horas)
    "mtbf": "N/A",        # Tempo médio entre falhas
    "availability": "95%", # Disponibilidade
    "backlog": 25         # Ordens pendentes
  }
}
```

### Assets ✨ **[Phase 1 - NOVO]**

#### Listar Equipamentos
```bash
GET /api/tenants/{plantId}/assets
Authorization: Bearer <token>
```

#### Buscar Equipamentos
```bash
GET /api/tenants/{plantId}/assets?search=pump&category={categoryId}
Authorization: Bearer <token>
```

#### Criar Equipamento
```bash
POST /api/tenants/{plantId}/assets
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "PUMP-001",
  "name": "Bomba Centrífuga Principal",
  "category_id": "uuid",
  "manufacturer": "SKF",
  "model": "MODEL-500",
  "serial_number": "SN-12345",
  "description": "Bomba principal de circulação",
  "location": "Sector A",
  "status": "operacional",
  "acquisition_date": "2020-01-15T00:00:00Z",
  "acquisition_cost": "50000.00",
  "is_critical": true,
  "meter_type": "horas",
  "current_meter_value": "1250.50"
}
```

#### Obter Detalhes do Equipamento
```bash
GET /api/tenants/{plantId}/assets/{id}
Authorization: Bearer <token>
```

#### Atualizar Equipamento
```bash
PUT /api/tenants/{plantId}/assets/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "manutencao",
  "current_meter_value": "1500.00"
}
```

#### Eliminar Equipamento
```bash
DELETE /api/tenants/{plantId}/assets/{id}
Authorization: Bearer <token>
```

#### Equipamentos com Manutenção em Atraso
```bash
GET /api/tenants/{plantId}/assets/maintenance/due
Authorization: Bearer <token>
```

---

### Work Orders

#### Listar
```bash
GET /api/tenants/{plantId}/work-orders?status=aberta
Authorization: Bearer <token>
```

#### Obter Detalhes
```bash
GET /api/tenants/{plantId}/work-orders/{id}
Authorization: Bearer <token>
```

#### Criar
```bash
POST /api/tenants/{plantId}/work-orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "asset_id": "uuid",
  "title": "Manutenção preventiva",
  "description": "Limpeza e lubrificação",
  "priority": 2,
  "maintenance_type": "preventiva",
  "planned_hours": 2,
  "planned_date": "2026-02-01T10:00:00Z"
}
```

#### Atualizar
```bash
PUT /api/tenants/{plantId}/work-orders/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "em_curso",
  "assigned_user_id": "uuid",
  "actual_hours": 2.5
}
```

---

## 🎯 Funcionalidades Detalhadas

### 1. Autenticação & Autorização

| Role | Acesso |
|------|--------|
| SuperAdmin | Todos os endpoints, todas as empresas |
| AdminEmpresa | Sua empresa, todas as plantas |
| GestorManutencao | Criar/editar ordens, sua planta |
| Supervisor | Ver/atribuir ordens, sua planta |
| Tecnico | Executar ordens, sua planta |
| Leitor | Apenas visualização, sua planta |

### 2. Equipamentos (Assets) ✨ **[Phase 1]**

**Estados do Equipamento:**
```
operacional → Pronto para uso
parado      → Indisponível
manutencao  → Em manutenção
```

**Tipos de Contador:**
```
horas   → Medição em horas de funcionamento
km      → Medição em quilómetros
ciclos  → Medição em ciclos de operação
outro   → Outro tipo de medição customizado
```

**Recursos:**
- Categorias customizáveis (Bombas, Motores, Compressores, etc.)
- Números de série e QR codes
- Rastreamento de aquisição (data e custo)
- Leitura dinâmica de contadores
- Marcação de equipamentos críticos
- Busca por nome ou código
- Filtro por categoria e planta
- Identificação automática de equipamentos com manutenção em atraso

**Validação Zod:**
- Código: 1-50 caracteres (obrigatório)
- Nome: 3-200 caracteres (obrigatório)
- Categoria: UUID válido (obrigatório)
- Status: enum validado
- Campos opcionais: fabricante, modelo, serial, localização, etc.

### 3. Ordens de Trabalho

**Estados:**
```
aberta      → Criada, aguardando atribuição
atribuida   → Atribuída, aguardando início
em_curso    → Técnico executando
concluida   → Finalizada com sucesso
cancelada   → Cancelada ou descontinuada
```

**Campos:**
- ID, Tenant, Plant, Asset
- Título, Descrição, Tipo (preventiva/corretiva)
- Prioridade (1-4), Status
- Técnico Atribuído, Horas (planejadas/reais)
- Datas: Criação, Planejamento, Execução, Exclusão (soft)

### 4. Dashboard & KPIs

**Métricas em Tempo Real:**
- Total de Ordens
- Ordens Abertas (não atribuídas)
- Ordens Atribuídas (aguardando)
- Ordens em Progresso
- Ordens Concluídas
- Ordens Canceladas

**KPIs Calculados:**
- MTTR (Mean Time To Repair) - horas médias para reparar
- MTBF (Mean Time Between Failures) - dias entre falhas
- Disponibilidade (%) - uptime do equipamento
- Backlog - ordens pendentes

### 4. Equipamentos & Ativos

**Cadastro Completo:**
- Código, Nome, Série, QR Code
- Categoria, Localização, Fabricante
- Modelo, Ano de Fabrico
- Contador de Horas/KM
- Histórico de Manutenção

### 5. Manutenção Preventiva

**Tipos Suportados:**
- Por Tempo (cada X horas/dias)
- Por Contador (cada X horas/km)
- Por Calendário (datas específicas)

**Checklists:**
- Tarefas por plano
- Descrição de cada tarefa
- Tempo estimado
- Ordem de execução

### 6. Gestão de Stock

**Peças Sobressalentes:**
- Código Único, Nome, Descrição
- Custo Unitário, Stock Atual
- Fornecedor Padrão
- Histórico de Movimentos

**Movimentos:**
- Entrada, Saída, Ajuste
- Quantidade, Motivo, Data
- Rastreabilidade Completa

---

## 💾 Base de Dados (17 Tabelas)

```
tenants              Empresas/clientes
plants               Fábricas
users                Utilizadores
user_plants          Atribuição user→plant
asset_categories     Categorias de equipamentos
assets               Equipamentos
maintenance_plans    Planos de manutenção
maintenance_tasks    Tarefas de planos
work_orders          Ordens de trabalho
work_order_tasks     Tarefas de ordens
spare_parts          Peças sobressalentes
stock_movements      Movimento de stock
suppliers            Fornecedores
meter_readings       Leituras de contadores
attachments          Ficheiros anexados
audit_logs           Auditoria RGPD
sla_rules            Regras de SLA
```

**Relações:**
- tenant 1→∞ plants, users, assets, work_orders
- plant 1→∞ assets, work_orders, maintenance_plans
- user ∞→∞ plant (via user_plants)
- asset 1→∞ work_orders, maintenance_plans, meter_readings

---

## 🚀 Deployment em Render

### Backend Service

```
Root: backend/
Build: npm install && npm run type-check && npm run build
Start: npm start
```

### Frontend Service

```
Root: frontend/
Build: npm install && npm run type-check && npm run build
Start: npm preview
```

### Passos Completos

1. Criar Backend Service em Render
2. Configurar Environment Variables (DATABASE_URL, JWT_SECRET, etc)
3. Criar Frontend Service
4. Configurar VITE_API_URL apontando para Backend
5. Conectar PostgreSQL (Render ou externo)
6. Deploy!

**Guia Detalhado:** Ver [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

---

## 🔒 Segurança

### Implementado

✅ **JWT Authentication**
- Access Token: 1 hora
- Refresh Token: 7 dias
- Stored em localStorage

✅ **Bcrypt Password Hashing**
- 10 rounds
- Nunca plain text

✅ **RBAC com 6 Roles**
- Permissões específicas por role
- Verificação em middleware
- Validação por endpoint

✅ **Multi-Tenant Isolation**
- Tenant ID injetado obrigatoriamente
- Validado em cada query
- Impossible acessar dados de outro tenant

✅ **CORS Protection**
- Whitelist de origem
- Credentials control
- Headers customizados

✅ **Auditoria RGPD**
- Soft deletes (nunca deletar)
- Audit logs de alterações
- Rastreamento user/ação/timestamp

✅ **Error Handling Seguro**
- Sem exposição de stack traces
- Mensagens genéricas
- Logging detalhado

### Recomendações Pré-Produção

⚠️ Alterar JWT_SECRET para 32+ caracteres aleatórios  
⚠️ Ativar HTTPS (Render faz automaticamente)  
⚠️ Configurar DATABASE_URL com credenciais seguras  
⚠️ Adicionar Helmet para security headers  
⚠️ Implementar rate limiting  
⚠️ Configurar WAF (Web Application Firewall)  

---

## 📂 Estrutura de Diretórios

```
Manuten-o-/
├── backend/
│   ├── src/
│   │   ├── app.ts                    Express app
│   │   ├── server.ts                 Entry point
│   │   ├── auth/jwt.ts               JWT + Bcrypt
│   │   ├── config/                   Database + Logger
│   │   ├── controllers/              3 controllers
│   │   ├── services/                 3 services
│   │   ├── middlewares/              Auth + Error
│   │   ├── routes/                   3 routes
│   │   ├── db/schema.ts              17 tabelas Drizzle
│   │   └── types/                    Type definitions
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                  React entry
│   │   ├── App.tsx                   Router
│   │   ├── pages/                    4 pages
│   │   ├── components/               2 components
│   │   ├── layouts/                  MainLayout
│   │   ├── hooks/                    useAuth
│   │   ├── context/                  Zustand stores
│   │   └── services/                 API client
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── README.md                         (Este arquivo)
├── RENDER_DEPLOYMENT.md              Guia Render
├── DEVELOPMENT.md                    Desenvolvimento
├── PROJECT_STRUCTURE.md              Estrutura detalhada
├── init.sh                           Script automático
└── .gitignore
```

---

## 📞 Suporte & Documentação

### Documentação Completa

| Documento | Conteúdo |
|-----------|----------|
| [README.md](./README.md) | Este arquivo - Visão geral |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Setup, debugging, best practices |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Estrutura detalhada, todas as tabelas |
| [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) | Passo-a-passo para Render |
| [COMPLETION_REPORT.md](./COMPLETION_REPORT.md) | Checklist de funcionalidades |

### Community

- **GitHub:** [djduartesantos-hub/Manuten-o-](https://github.com/djduartesantos-hub/Manuten-o-)
- **Issues:** [Reportar problemas](https://github.com/djduartesantos-hub/Manuten-o-/issues)
- **Discussions:** [Abrir discussão](https://github.com/djduartesantos-hub/Manuten-o-/discussions)

---

## 🧪 Testing

### Backend
```bash
cd backend
npm run type-check    # Validar TypeScript
npm run build         # Build para produção
npm run dev           # Desenvolvimento
```

### Frontend
```bash
cd frontend
npm run type-check    # Validar TypeScript
npm run build         # Build para produção
npm run dev           # Desenvolvimento
```

---

## 📊 Estatísticas do Projeto

```
Ficheiros:              65+
Linhas de Código:       5200+
Backend Packages:       360
Frontend Packages:      277
Database Tables:        17
API Endpoints:          17+ (6 novos - Assets)
React Components:       20+
TypeScript Files:       100% (strict mode)
Compilation Errors:     0 ✅
Phase 1 Status:         ✅ Complete
```

---

## ✨ Próximas Etapas (Roadmap)

### ✅ Phase 1 - Asset Management (COMPLETA)
**Data:** Janeiro 2026 | **Status:** ✅ Production Ready

**Implementado:**
- ✅ Validação com Zod (CreateAssetSchema, UpdateAssetSchema)
- ✅ Endpoints de Assets CRUD (GET, POST, PUT, DELETE)
- ✅ AssetService com 8 métodos (create, read, update, delete, search, filter, maintenance tracking)
- ✅ AssetController com 6 endpoints HTTP
- ✅ Seed data realista (50+ assets, 10 categorias)
- ✅ Testes unitários e de integração
- ✅ Role-based access control (planner, technician, supervisor, maintenance_manager, admin)
- ✅ Tenant isolation em todas operações
- ✅ TypeScript compilation: 0 errors

**Endpoints Disponíveis:**
```
GET    /api/tenants/:plantId/assets
POST   /api/tenants/:plantId/assets
GET    /api/tenants/:plantId/assets/:id
PUT    /api/tenants/:plantId/assets/:id
DELETE /api/tenants/:plantId/assets/:id
GET    /api/tenants/:plantId/assets/maintenance/due
```

Veja [PHASE_1_COMPLETION.md](./PHASE_1_COMPLETION.md) para detalhes completos.

---

### 🔧 Phase 2 - Planos de Manutenção e Gestão de Peças (2-3 semanas)
**Resumo:** Implementar sistema completo de manutenção preventiva e gestão de inventário de peças sobressalentes.

**Funcionalidades:**
- [ ] **Planos de Manutenção (CRUD)** - Criar, ler, atualizar e eliminar planos de manutenção preventiva
  - Agendamento por tempo (horas, dias) ou contador (km, ciclos)
  - Histórico de execuções com datas de próxima manutenção
  - Alertas automáticos quando manutenção está vencida
  - Relatórios de conformidade (% de planos executados)

- [ ] **Peças Sobressalentes (CRUD + Inventário)** - Catálogo completo de peças com controle de stock
  - Código de peça, fabricante, custo unitário
  - Nível mínimo de stock e quantidade em stock
  - Histórico de consumo e previsão de necessidade
  - Associação de peças a planos de manutenção

- [ ] **Movimentos de Stock (Entrada/Saída)** - Rastreamento de todo o movimento de inventário
  - Entrada: Compras, devoluções, ajustes
  - Saída: Consumo em ordens, devoluções, ajustes
  - Histórico completo com utilizador e data
  - Alertas de stock baixo

- [ ] **Upload de Ficheiros para Assets** - Documentação de equipamentos
  - Suporte para fotos, manuais, certificados
  - Armazenamento seguro em cloud (AWS S3 ou similar)
  - Versionamento de documentos
  - Limite de tamanho e tipos de ficheiro

- [ ] **Relatórios de Manutenção** - Análise de dados de manutenção
  - Custos por equipamento e por plano
  - MTTR (Mean Time To Repair) e MTBF (Mean Time Between Failures)
  - Equipamentos mais problemáticos
  - Aderência a planos de manutenção

**Endpoints esperados:** 15+ novos endpoints
**Base de dados:** 3-4 novas tabelas

---

### ⚡ Phase 3 - Escalabilidade e Performance (2-3 semanas)
**Resumo:** Otimizar plataforma para suportar volumes grandes de dados e notificações em tempo real.

**Funcionalidades:**
- [ ] **WebSocket (Notificações em Tempo Real)** - Comunicação bidirecional
  - Notificações de novas ordens de trabalho
  - Alertas de equipamentos críticos
  - Status live de ordens em execução
  - Avisos de manutenção vencida
  - Dashboard atualizado em tempo real

- [ ] **Redis (Caching)** - Cache distribuído para performance
  - Cache de assets e categorias (evita queries frequentes)
  - Cache de planos de manutenção
  - Sessões de utilizador
  - Dados de dashboard (KPIs)
  - TTL (Time To Live) automático

- [ ] **Elasticsearch (Busca Avançada)** - Motor de busca full-text
  - Busca rápida de assets por múltiplos campos
  - Busca em histórico de ordens de trabalho
  - Filtros complexos e faceted search
  - Auto-complete para códigos e nomes
  - Análise de relatórios

- [ ] **Message Queue (Bull + Redis)** - Processamento assíncrono
  - Geração de relatórios em background
  - Envio de emails de notificações
  - Backup automático de dados
  - Processamento de uploads de ficheiros
  - Limpeza de dados antigos (soft deletes)

**Impacto:** Suportar 1000+ equipamentos e 10000+ ordens de trabalho sem degradação

---

### 🚀 Phase 4 - Produção e Conformidade (1 semana)
**Resumo:** Preparar plataforma para ambiente de produção com segurança, monitoramento e documentação.

**Funcionalidades:**
- [ ] **Helmet (Security Headers)** - Proteção de segurança HTTP
  - Content Security Policy (CSP)
  - X-Frame-Options (Clickjacking protection)
  - Strict-Transport-Security (HTTPS)
  - X-Content-Type-Options (MIME type sniffing)
  - Proteção contra XSS

- [ ] **Rate Limiting** - Proteção contra abuso
  - Limite de requisições por IP
  - Limite de requisições por utilizador
  - Limite de requisições por endpoint
  - Whitelist de IPs seguros
  - Alertas de tentativas de abuso

- [ ] **Swagger/OpenAPI** - Documentação automática de APIs
  - Especificação OpenAPI 3.0 gerada automaticamente
  - Interface Swagger UI para testar endpoints
  - Documentação automática de schemas
  - Exemplos de requisição/resposta
  - Download de documentação em PDF

- [ ] **Monitoring (Sentry)** - Rastreamento de erros e performance
  - Captura automática de exceções
  - Rastreamento de performance (slow queries, slow requests)
  - Source maps para debugging
  - Alerts em tempo real
  - Dashboard com histórico de erros

- [ ] **CI/CD (GitHub Actions)** - Automação de deployment
  - Testes automáticos em cada push
  - Build automático de imagens Docker
  - Deploy automático para staging/production
  - Rollback automático em caso de falha
  - Notificações em Slack/Email

**Impacto:** Plataforma enterprise-ready com SLA de 99.9% uptime

---

### 💡 Phase 5 - Análise Avançada e IA (Futuro)
**Resumo:** Recursos avançados de análise e machine learning para otimização de manutenção.

**Ideias de Desenvolvimento:**
- [ ] **Previsão de Falhas** - Machine Learning para prever quando equipamentos vão falhar
  - Análise de padrões históricos
  - Alertas precoces antes de falhas
  - Otimização de planos de manutenção
  - Redução de downtime não planejado

- [ ] **Otimização de Rotas** - Para técnicos em campo
  - Agrupamento inteligente de ordens próximas
  - Rotas otimizadas (Traveling Salesman Problem)
  - Estimativa de tempo de deslocamento
  - Sincronização com GPS do técnico

- [ ] **Análise de Custos** - Dashboard financeiro
  - Custo total de propriedade (TCO) por equipamento
  - ROI de planos de manutenção
  - Análise de fornecedores
  - Previsão de orçamento

- [ ] **Benchmarking Setorial** - Comparação com outras empresas
  - KPIs da sua empresa vs. setor
  - Relatórios de eficiência comparativa
  - Best practices recomendadas
  - Oportunidades de otimização

- [ ] **Mobile App Nativa** - Aplicação iOS e Android
  - Execução de ordens de trabalho offline
  - Captura de fotos e assinaturas
  - Sincronização automática
  - Notificações push
  - QR code scanning para assets

---

## 🆕 Novas Ideias de Desenvolvimento

### Curto Prazo (1-2 meses)
1. **Dashboard Customizável** - Cada utilizador pode criar seu próprio dashboard com widgets
2. **Relatórios Agendados** - Enviar relatórios automáticos por email (semanal, mensal)
3. **API REST Pública** - Permitir integrações com sistemas externos (ERP, CRM)
4. **Autenticação OAuth2** - Login com Google, Microsoft, GitHub
5. **Dark Mode** - Interface escura para reduzir fadiga ocular

### Médio Prazo (2-4 meses)
6. **Integração com IoT** - Conectar sensores aos equipamentos para dados em tempo real
7. **Chatbot IA** - Assistente virtual para responder dúvidas sobre manutenção
8. **Análise Preditiva Avançada** - Prever necessidade de peças baseado em padrões
9. **Gamificação** - Pontos e badges para técnicos motivação
10. **Multi-idioma** - Suporte para EN, ES, FR, DE além de PT

### Longo Prazo (4+ meses)
11. **Realidade Aumentada (AR)** - Visualizar manuais e instruções em AR
12. **Gemini/GPT Integration** - Descrever problema em texto natural para gerar ordem
13. **Supply Chain Optimization** - Integração com fornecedores para reordenação automática
14. **Conformidade Regulatória** - Auditorias automáticas para OSHA, ISO, etc.
15. **Marketplace de Add-ons** - Plugin architecture para extensibilidade

---

## 📜 Licença

MIT License - Veja [LICENSE](./LICENSE) para detalhes

---

## 🎓 Credenciais Demo

```
Empresa:  cmms-demo
Email:    admin@cmms.com
Senha:    Admin@123456
```

---

**Desenvolvido com ❤️ para gestão eficiente de manutenção**

| Versão | Data | Status |
|--------|------|--------|
| 1.0.0 | Janeiro 2026 | ✅ Production Ready |

🚀 **Comece agora:**
```bash
npm install
npm run dev
```

# 💡 Roadmap de Desenvolvimento - Manuten-o CMMS v1.3.0-beta.2

**Status Atual:** Roadmap 2026 (em revisão)  
**Última Atualização:** 11 Fevereiro 2026  
**Versão:** 2.2 (inclui atualização de Relatórios + UX)

> Nota: este ficheiro estava desatualizado. Para o detalhe das mudanças recentes (BD/API/UX) ver:
> - [PROJECT_STATUS_UPDATE_2026-02-09.md](./PROJECT_STATUS_UPDATE_2026-02-09.md)
> - [ROADMAP_DRAFT_2026-02-09_FACTORY+MGMT.md](./ROADMAP_DRAFT_2026-02-09_FACTORY+MGMT.md)

---

## 🔎 Nota rápida (Atualização 2026-02-11)

- Relatórios evoluíram para um **dashboard avançado** com:
   - persistência de preferências/filtros
   - presets de período + comparação
   - drill-down por clique nos gráficos
   - export CSV/PDF melhorado
   - modos completos de **Downtime** e **Preventivas** (KPIs + gráficos + tabela)
- UX de Ordens/Preventivas: ícones mais responsivos no mobile e consistência com o Dashboard.

- Settings/Hardening (fecho de MVP):
   - Biblioteca de Documentos: upload alinhado com backend (multipart), preview e histórico de versões
   - Alertas: botão “Testar” por configuração
   - Warnings: mini charts (distribuição + métricas + progress bars)
   - Backend: Helmet + rate limiting + Swagger/OpenAPI (`/api/docs`, `/api/openapi.json`)

**Referências (commits):** `fded497`, `763b477`, `7dc24c3`, `8fd2246`, `49af06d`, `6476ef8`.

**Referências (Settings/Hardening):** `d3e4b6e`, `b15b1c2`.

---

## 🧾 Backlog (registado para realizar mais tarde)

> Itens identificados após o fecho de CI/CD (Render) + baseline de OpenAPI.

### OpenAPI / Swagger (expansão)
- [x] Cobertura expandida de rotas core (Assets, Stock/Movimentos, Spare Parts, Kits, Tickets, Profile, Planner, Search, Notifications, Stocktake).
- [x] Cobertura completa de rotas (Reports, Admin/Setup, SuperAdmin, Jobs, Customization, Tenants, Documents/Uploads detalhados).
- [x] Esquemas de erro consistentes (`ErrorResponse`), paginação (`limit`, `offset`, `total`), sorting/filter (query params) e exemplos por endpoint.
- [x] `securitySchemes` (JWT/Bearer) + `tags` normalizadas.
- [x] Alinhar nomes/IDs (`schedule_id` vs `scheduleId`, etc.) e respostas (status codes, payloads) com a implementação.

### CD (Render) — “polish”
- [ ] Melhorar observabilidade do deploy: logs mais claros no workflow + link direto para o deploy/serviço (quando aplicável).
- [x] Gating/segurança do workflow: impedir deploy em PRs/forks.
- [x] Healthcheck pós-deploy (ex.: chamar endpoint `/api/health` e falhar workflow se não responder).
- [ ] Rever estratégia de migrations no arranque (alternativa a instalar dev deps no runtime: mover tooling necessário para deps, ou correr migrations noutro passo controlado).

---

## 🏭 Track “Fábrica + Gestão” (2026-02-09)

Este track é o plano **prático** para as próximas iterações, com foco em operação e governança. O detalhe vive no draft; aqui fica o resumo acionável.

### Fase 0 — Quick Wins (1-2 semanas)
- Ordens: CTAs dedicados para **Pausar/Cancelar** com motivo no próprio fluxo.
- Preventivas: “Adiar/Skip ciclo” com motivo.
- Relatórios: export simples de downtime (por ativo e por período).

### Fase 1 — Ordens: timeline + requisitos de fecho (2-3 semanas)
- Timeline legível (eventos chave) consistente com audit logs.
- Downtime enriquecido (tipo/categoria) e validações mais robustas.
- Fecho com recomendação (ou regra por role) de causa raiz/ação corretiva.

**Decisão (por agora):** timeline começa **derivada de audit logs**; `work_order_events` só entra se houver necessidade real.

### Fase 2 — Preventivas: tolerância + âncora (3-4 semanas)
- Tolerância: `soft` (aviso) e `hard` (exige **justificação** fora da janela; sem bloqueio por defeito).
- Âncora de agendamento (fixo vs intervalo) e anti-duplicados “1 ativo por janela”.

### Fase 3 — Stock/Peças: reserva + kits + previsão (3-5 semanas)
- ✅ **Concluída (2026-02-09)**: reserva de peças por ordem; kits por plano/categoria; previsão simples (planeado vs stock).
   - Reservas por ordem + patch BD (commit 16)
   - Kits + patch BD + UI gestão (commits 17-18)
   - Aplicar kit na Ordem (commit 19)
   - Previsão simples (preventivas futuras + kits) (commit 21)

### Fase 4 — Alertas/SLA: aging por fase + excluir pausa (2-3 semanas)
- ✅ **Concluída (2026-02-09)**: SLA com “tempo em pausa não conta” (deadline efetivo + notificar ao retomar) + alertas por aging por fase.

### Fase 5 — Relatórios/KPIs: downtime e execução (2-4 semanas)
- Pareto downtime + KPIs por fase (análise/execução), pausas, compliance com tolerância.

---

## 🎯 Estado do Projeto

### ✅ COMPLETO (Phases 1-2)

#### **Phase 1: Asset Management** ✓
- CRUD completo de equipamentos
- Categorização e hierarquias
- Histórico de manutenção
- Tracking de mudanças
- Busca e filtros avançados

#### **Phase 2: Maintenance Planning + Spare Parts** ✓
- Ordens de trabalho com SLA automático
- Planos de manutenção preventiva/corretiva
- Tarefas e subtarefas
- Gestão de peças de reposição
- Movimentos de stock

#### **Phase 2B: Advanced Reporting** ✓
- 4 tipos de relatórios
- Métricas: MTTR, MTBF, SLA Compliance
- Exportação CSV + PDF com gráficos
- Filtros avançados

---

## 🔄 EM DESENVOLVIMENTO (Phase 3)

### **Phase 3: Settings & Configuration Hub** 🔄 (2-3 semanas)

#### Implementado ✅
- ✅ **Database Schema** - Alert configurations, history, documents com versionamento
- ✅ **AlertService** - CRUD alertas + predictive warnings + MTBF analysis
- ✅ **DocumentService** - Upload com versionamento automático
- ✅ **API Routes** (`/api/alerts/*`) - 13 endpoints
- ✅ **SettingsPage Layout** - Sidebar navigation + 5 seções
- ✅ **RolesPermissions Dashboard** - Matrix de permissões por role
- ✅ **Swagger/OpenAPI** - `/api/docs` + `/api/openapi.json`
- ✅ **Hardening básico** - Helmet + rate limiting

#### A Completar (Próximas 1-2 semanas) 🔄
- ✅ **AlertsSettings Component**
   - CRUD + validações + lista + botão “Testar”

- ✅ **PredictiveWarnings Dashboard**
   - Severity badges + recomendações + mini charts (distribuição + métricas)

- ✅ **DocumentsLibrary Component**
   - Upload + preview + histórico de versões (fallback local em `/uploads/...`)

- [ ] **DocumentsLibrary (polish)**
   - ✅ Tagging system (UX + validações)
   - ✅ Documentos expirando/alert (UI consumindo `/api/alerts/documents/expiring`)
   - Storage externo (S3/R2) para produção

- [x] **MaintenancePlannerSettings** - Wizard preventivo
   - ✅ Multi-step wizard
   - ✅ Frequência (dias, horas, ciclos)
   - ✅ Peças obrigatórias
   - ✅ Documentos relacionados
   - ✅ ROI calculator
   - Tempo estimado: **4-5 dias**

---

## 📅 Roadmap 2026

### **CURTO PRAZO (Fevereiro - Março)**

#### Phase 3B: Real-time & Performance (3-4 semanas) 🔜
**Objetivo:** Notificações live, caching, busca rápida

1. **WebSocket Real-time** ✅
   - Socket.io setup
   - Notificações de novas ordens
   - Atualizações ao vivo
   - Room management por tenant

2. **Redis Caching** ✅
   - Cache de sessões JWT
   - Cache de queries frequentes
   - Cache de relações
   - TTL strategy por tipo de dado

3. **Elasticsearch** ✅
   - Índices de ordens, equipamentos
   - Full-text search com filtros
   - Reindex automático
   - Search UI integrada

4. **Job Queue** ✅
   - Bull.js + Redis
   - Tarefas assíncronas (emails, exports)
   - Retry logic
   - Dashboard de jobs (stats + lookup)

**Impacto:** ↓50-70% latência, Live UX, escalável a 100k+ registos

---

#### Phase 3C: Notificações & Alertas (2-3 semanas) 🔜
**Objetivo:** Sistema automático de notificações

1. **Sistema de Alertas** (1 semana)
   - Alertas de SLA crítico
   - Stock abaixo limite
   - Equipamentos com problemas recorrentes
   - Técnicos sobrecarregados
   - Multiple channels (email, push, SMS)

2. **Relatórios por Email** (1 semana)
   - Templates customizáveis
   - Agendamento (diário, semanal, mensal)
   - Envio automático
   - Histórico de relatórios

3. **Dashboard de Alertas** (3 dias)
   - Vista centralizada
   - Filtro por severidade
   - Bulk resolve actions
   - Analytics (trends, SLA compliance)

**ROI:** 🔥 Muito Alto - Operadores sempre informados

---

#### Phase 3D: Multi-fábrica + Perfil + Home por Role (3-5 semanas) ✅
**Objetivo:** desbloquear operação multi-fábrica e melhorar a experiência pós-login

**Nota de âmbito (2026):** a curto prazo existe **apenas 1 empresa/tenant**. O foco é **multi-fábrica (plants) dentro do mesmo tenant**. O suporte a **multi-empresa (multi-tenant real)** fica planeado para uma fase futura.

1. **Multi-fábrica (ativação completa)** ✅
   - Permitir **criar novas fábricas/plantas** (admin) e gerir dados base por fábrica.
   - Seleção de **fábrica ativa** no frontend (selector persistido) e scoping consistente em toda a app.
   - Regras de acesso: memberships por fábrica (role por fábrica quando necessário).
   - Auditoria: registar mudança de fábrica ativa e ações administrativas.

   **DB/API (provável)**
   - `plants/factories` (entidade de fábrica) + `user_plant_memberships`.
   - Normalizar `plant_id`/`factory_id` e garantir **isolamento** (middleware + queries).

   **Aceitação**
   - Admin cria fábrica nova; utilizadores só veem dados da(s) fábrica(s) onde têm acesso.
   - Nenhuma rota “vaza” dados entre fábricas (inclui relatórios, uploads, sockets e cache).

2. **Sistema de Perfil de Utilizador (clicar no nome)** ✅
   - Ao clicar no nome (header): menu com **Perfil**, **Preferências** (ex.: idioma/tema), **Sair**.
   - Página “Perfil”: dados do utilizador + ações (ex.: alterar palavra-passe).
   - (Opcional) “Atividade recente” derivada de audit logs.

3. **Página inicial pós-login por Role** ✅
    - Landing diferente por role (e/ou por permissão):
       - `admin`: visão de saúde do sistema + gestão (utilizadores, fábricas, configs)
       - `manager`: KPIs + backlog + SLA/aging
       - `technician`: ordens atribuídas + hoje/atrasadas + ações rápidas
       - `viewer`: visão read-only (resumo + relatórios)
    - Layout e widgets mínimos (sem inventar novas páginas além do necessário).

4. **Modificar a página de Login (UX + segurança)** ✅
   - Melhorias de UX (validações, mensagens de erro, loading states, acessibilidade).
   - Preparar base para: “Esqueci-me da password”, e/ou MFA/SSO (se entrar no plano).

---

#### Quick Wins Paralelos (1-2 semanas)
- **Dark Mode** (3-4 dias) - Toggle + localStorage + CSS variables
- **Multi-idioma** (2-3 dias) - i18next para PT, EN, ES
- **Dashboard Customizável** (2-3 dias) - Drag-drop widgets

**Total Phase 3:** 8-10 semanas completo

---

## 🧩 Ideias & Sugestões (Backlog priorizado)

### Segurança (P1/P2)
- Refresh tokens (curta duração no access token) + revogação por sessão.
- Política de passwords + lockout progressivo + auditoria de tentativas.
- Permissões por ação (RBAC fino) nas rotas mais sensíveis (admin/setup, documentos, stock).
- Logs de segurança: export e retenção (quem fez o quê, quando, em que fábrica).

### Performance / Escalabilidade (P1/P2)
- Índices DB para queries mais frequentes (ordens por fábrica/estado/prioridade; relatórios por período).
- Cache por fábrica com keys explícitas + invalidation por eventos.
- Paginação consistente (backend + frontend) em listas grandes.
- Bundle splitting no frontend (routes lazy) para reduzir TTI.

### Alarmes / Observabilidade (P2)
- “Centro de alarmes” (vista) com severidade, ack/resolve e histórico.
- Job de verificação periódico (SLA/aging/stock/doc expiring) com envio multi-canal.
- Integração com email (já existe via jobs) + preparar webhook/Teams/Slack.

### Qualidade (P2/P3)
- Melhorar cobertura de testes em serviços críticos (auth, multi-fábrica isolation, stock).
- E2E smoke (login + criar ordem + concluir) para evitar regressões.


### **MÉDIO PRAZO (Abril - Maio)**

#### Phase 4: API Pública & Integrações (4-5 semanas) 🔮
**Objetivo:** Integração com sistemas externos

1. **OpenAPI/Swagger** (1 semana)
   - Documentação automática
   - Try-it-out feature
   - SDK auto-generation

2. **OAuth2 + SSO** (2 semanas)
   - Google/Microsoft/GitHub login
   - SAML support
   - Auto-provisioning
   - MFA

3. **Webhooks** (1 semana)
   - Event publishing
   - Retry logic
   - Signature verification
   - Event logs

4. **Client SDKs** (1 semana)
   - Python SDK
   - JavaScript/TypeScript SDK
   - Go SDK
   - Rate limiting wrapper

**Integrações Alvo:**
- ERP: SAP, Oracle, Odoo
- CRM: Salesforce, HubSpot
- HRIS: Workday, BambooHR
- Accounting: QuickBooks, Xero
- Calendários: Outlook, Google Calendar

**Impacto:** Fluxo automático de dados, reduz entrada manual, aumenta adoção

---

#### Phase 5: IA & Previsão (3-4 semanas) 🔮
**Objetivo:** Machine Learning + Automação

1. **IA Generativa** (2 semanas)
   - Integração GPT-4 / Gemini
   - Geração de ordens a partir de descrições
   - Análise automática de problemas
   - Tradução automática de docs
   - Sugestões de ações

2. **Análise Preditiva de Peças** (2 semanas)
   - Time series forecasting (Prophet)
   - Previsão de consumo 3-6 meses
   - Recomendações de reordenação
   - Otimização de stock
   - Integração com fornecedores

**ROI:** 🔥 Muito Alto - Evita stockouts, otimiza supply chain

---

### **LONGO PRAZO (Junho+)**

#### Phase 6: IoT & Sensores (6-8 semanas) 🚀
**Objetivo:** Dados em tempo real, manutenção verdadeiramente preditiva

- MQTT/CoAP protocol support
- Dashboard de sensores ao vivo
- Anomaly detection com ML
- Integração com histórico
- Alertas baseados em padrões

**Casos:** Vibração → Alerta falha iminente, Temp → Overclocking, etc.

---

#### Phase 7: Conformidade & Auditoria (4-5 semanas) 🚀
**Objetivo:** OSHA, ISO 9001, ISO 45001

- Templates de procedimentos conformes
- Audit trail completo
- Checklists automáticos
- Relatórios de conformidade
- Alertas de não-conformidade

---

#### Phase 8: Realidade Aumentada (8-10 semanas) 🚀
**Objetivo:** Manuais com AR

- App mobile com câmara
- QR code scanning
- Instruções sobrepostas em 3D
- Vídeos de procedimentos
- Documentação visual

---

---

## 📊 Matriz Completa de Features

| Feature | Status | Esforço | ROI | Sprint |
|---------|--------|---------|-----|--------|
| **Asset Management** | ✅ | - | - | P1 |
| **Work Orders + SLA** | ✅ | - | - | P2 |
| **Maintenance Plans** | ✅ | - | - | P2 |
| **Spare Parts** | ✅ | - | - | P2 |
| **Advanced Reports** | ✅ | - | - | P2B |
| **Alerts & Notifications** | 🔄 | ⭐⭐ | Alto | P3A |
| **Documents Library** | 🔄 | ⭐⭐ | Alto | P3A |
| **Predictive Warnings** | 🔄 | ⭐⭐ | Alto | P3A |
| **RolesPermissions** | 🔄 | ⭐ | Médio | P3A |
| **WebSocket Real-time** | 🔜 | ⭐⭐⭐ | Muito Alto | P3B |
| **Redis Caching** | 🔜 | ⭐⭐ | Muito Alto | P3B |
| **Elasticsearch** | 🔜 | ⭐⭐⭐ | Muito Alto | P3B |
| **Dark Mode** | 🔜 | ⭐ | Médio | Quick Win |
| **Multi-idioma** | 🔜 | ⭐⭐ | Alto | Quick Win |
| **Dashboard Customizável** | 🔜 | ⭐⭐ | Alto | Quick Win |
| **API Pública** | 🔜 | ⭐⭐⭐ | Muito Alto | P4 |
| **OAuth2 + SSO** | 🔜 | ⭐⭐ | Alto | P4 |
| **IA Generativa** | 🔜 | ⭐⭐⭐ | Muito Alto | P5 |
| **Análise Preditiva** | 🔜 | ⭐⭐⭐⭐ | Muito Alto | P5 |
| **IoT/Sensores** | 🔜 | ⭐⭐⭐⭐ | Muito Alto | P6 |
| **Conformidade Auto** | 🔜 | ⭐⭐⭐⭐ | Muito Alto | P7 |
| **AR para Manuais** | 🔜 | ⭐⭐⭐⭐⭐ | Muito Alto | P8 |
| **Marketplace Plugins** | 🔜 | ⭐⭐⭐⭐ | Alto | P9 |
| **Chatbot IA** | 🔜 | ⭐⭐⭐ | Alto | P6 |
| **Gamificação** | 🔜 | ⭐⭐ | Alto | P7 |
| **Supply Chain Opt** | 🔜 | ⭐⭐⭐⭐ | Muito Alto | P5 |

---

## 🎯 Timeline Visual

```
2026
├─ FEV-MAR: Phase 3 Settings Hub
│  ├─ ✅ Foundation (DB, Services, API, UI Layout)
│  ├─ 🔄 Alerts Settings (in progress)
│  ├─ 🔄 Predictive Warnings (in progress)
│  ├─ 🔄 Documents Library (in progress)
│  ├─ 🔄 Maintenance Planner (in progress)
│  └─ Quick Wins (Dark Mode, Multi-lang, Dashboard)
│
├─ ABR-MAI: Phase 3B-3C Real-time + Notifications
│  ├─ WebSocket live updates
│  ├─ Redis caching
│  ├─ Elasticsearch search
│  ├─ System de alertas
│  └─ Relatórios por email
│
├─ JUN-JUL: Phase 4-5 API + IA
│  ├─ API Pública + OAuth2
│  ├─ IA Generativa (GPT-4)
│  ├─ Análise Preditiva (ML)
│  └─ Supply Chain Optimization
│
└─ AGO+: Phase 6-8 IoT + Conformidade + AR
   ├─ IoT/Sensores
   ├─ Conformidade (OSHA, ISO)
   ├─ AR para Manuais
   └─ Marketplace de Plugins
```

---

## 📈 Métricas de Sucesso

### Por Feature
- **Adoption Rate:** % utilizadores usando
- **Engagement:** Frequência de uso semanal
- **Satisfaction:** NPS score
- **Performance:** Latência, uptime, erros

### Negócio
- **Churn Reduction:** % clientes retidos
- **Revenue:** MRR growth
- **Support Cost:** Redução tickets
- **Time Saved:** Horas economizadas/mês

---

## 🔐 Prioridades Fixas

### NUNCA mudar de prioridade
1. **Segurança** - JWT, encryption, RBAC always first
2. **Performance** - Caching, indexing, query optimization
3. **Reliability** - Error handling, logging, monitoring
4. **Data Integrity** - Transactions, constraints, soft deletes

### Mudar de prioridade SÓ se
- Feedback crítico do cliente
- Bug crítico de segurança
- Oportunidade de negócio (new customer)
- Competição direta (competitor feature)

---

## 📋 Checklist de Qualidade

Cada feature DEVE ter:
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] Type safety (0 TypeScript errors)
- [ ] Error handling + logging
- [ ] Performance optimized (<100ms p95)
- [ ] Documentation (README + inline comments)
- [ ] Demo/Video tutorial
- [ ] Migration scripts (if DB change)
- [ ] Rollback plan
- [ ] Monitoring + alerts

---

## 🚀 Como usar este documento

1. **Sprint Planning:** Pegar próximas features da fase current
2. **Acompanhar Progress:** Atualizar status (✅/🔄/🔜)
3. **Comunicar Stakeholders:** Mostrar timeline realista
4. **Ajustar Prioridades:** Se feedback do cliente
5. **Revisão Trimestral:** Atualizar roadmap com learnings

---

**Mantido por:** Tim de Desenvolvimento  
**Próxima Revisão:** 1 de Abril 2026  
**Feedback:** GitHub Issues #roadmap tag

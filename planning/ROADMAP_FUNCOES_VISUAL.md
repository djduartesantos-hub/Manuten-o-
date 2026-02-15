# Roadmap Visual — Funções (a partir das “Ideias”)

Objetivo: transformar o “banco de ideias” num **plano visual por módulos** para seguirmos a implementação.

- Fonte principal: [planning/ROADMAP_IDEIAS_COMPLETAR_PRODUTO.md](planning/ROADMAP_IDEIAS_COMPLETAR_PRODUTO.md)
- Roadmap por fases (sprints): [planning/ROADMAP_FASES_FINALIZACAO.md](planning/ROADMAP_FASES_FINALIZACAO.md)
- Roadmap técnico 2026: [docs/ARCHITECTURE/ROADMAP_2026.md](docs/ARCHITECTURE/ROADMAP_2026.md)

## Como usar (e como vamos “marcar feito”)

- Este ficheiro é o **tracking oficial** do estado das funções.
- Quando algo ficar concluído:
  - trocar `[ ]` por `[x]`
  - adicionar **data** e (opcional) **commit** no fim da linha.

Legenda de estado:
- `[x]` = feito
- `[ ]` = por fazer
- `→` = depende de outro bloco

Última verificação do estado `[x]`: **2026-02-13** (validação por referência direta a ficheiros do código).

---

## Mapa visual (módulos e dependências)

```mermaid
flowchart TD
  A[Plataforma & Operações\nAuth • RBAC • Auditoria • Observabilidade] --> B[SuperAdmin\nDiagnóstico • Suporte • Export • Repair]
  A --> C[Work Orders\nWorkflow • Evidências • SLA]
  A --> D[Preventivas & Planeamento\nRecorrência • Calendário]
  A --> E[Ativos\nInventário • Ciclo de vida • QR/NFC]
  A --> F[Stock & Compras\nReservas • Movimentos • Requisições]
  A --> G[Documentos & Compliance\nVersões • Validade • Evidências]
  A --> H[Notificações & Alertas\nRegras • Canais • Agendamentos]
  A --> I[Integrações\nERP • Email→OT • Webhooks]
  A --> J[Experiência (UX)\nDashboards persona • PWA • i18n]

  C --> H
  D --> H
  F --> C
  G --> C
  I --> C
```

---

## Checklist por módulo

### 1) Plataforma & Operações (base)

- [x] Auth + tenant scoping base — ver backend/src/middlewares/auth.ts, backend/src/middlewares/tenant.ts, frontend/src/services/api.ts
- [x] RBAC base (roles/permissões) + normalização/repair — ver backend/src/services/rbac.service.ts, backend/src/controllers/setup.controller.ts, backend/src/routes/setup.routes.ts, frontend/src/pages/SettingsPage.tsx
- [x] Hardening básico (helmet/rate limit) + OpenAPI básico — ver backend/src/app.ts, backend/src/routes/docs.routes.ts
- [ ] Auditoria completa com diff por alteração (quem/antes/depois)
- [x] Gestão de sessões (revogar sessões ativas, logs de login falhado) — ver backend/src/controllers/auth.controller.ts, backend/src/middlewares/auth.ts (2026-02-13)
- [ ] Políticas de segurança (password policy/lockout) → depende de “gestão de sessões”
- [ ] MFA (TOTP) por tenant

### 2) SuperAdmin (operações e suporte)

- [x] Seleção de empresa persistida (última escolhida / primeira) e sem “Global” — ver frontend/src/components/Header.tsx, frontend/src/pages/SettingsPage.tsx
- [x] Consola SuperAdmin simplificada (sem navegação no topo; layout mais mobile) — ver frontend/src/pages/SettingsPage.tsx
- [x] Diagnósticos + exportações (bundle, integridade, drift, audit, exports) — ver backend/src/routes/superadmin.routes.ts, backend/src/controllers/superadmin.controller.ts
- [x] Ferramenta “Reparar RBAC” (patch/seed) — ver backend/src/controllers/setup.controller.ts, backend/src/routes/setup.routes.ts, frontend/src/pages/SettingsPage.tsx
- [x] Health score por tenant + alertas (UI + export + bundle) — ver backend/src/controllers/superadmin.controller.ts, backend/src/routes/superadmin.routes.ts, frontend/src/pages/SettingsPage.tsx (2026-02-13, commit 0c65f83)
- [x] Quarantine/read-only por tenant (bloqueio de writes + toggle SuperAdmin) (2026-02-13, commit 3b9a844)
- [x] Sistema de Tickets (fábrica → empresa → superadmin) + auditoria/timeline + notificações + RBAC → ver [planning/ROADMAP_SUPERADMIN_TICKETS.md](planning/ROADMAP_SUPERADMIN_TICKETS.md)

### 3) Work Orders (OT) — “profissional”

- [x] Work orders base + SLA — ver backend/src/routes/workorder.routes.ts, backend/src/services/workorder.service.ts, backend/src/utils/workorder-sla.js
- [x] Workflow configurável (estados/transições/aprovações)
- [x] Evidências completas (anexos/fotos antes/depois) → liga a “Documentos & Compliance”
- [x] Timeline/audit legível de OT (derivada de audit logs)
- [x] Templates de OT por tipo
- [ ] Relatório PDF (opcional)

### 4) Preventivas & Planeamento

- [x] Preventivas base + schedules — ver backend/src/routes/maintenance.routes.ts, frontend/src/services/api.ts
- [x] Calendário unificado (preventivas + OTs + paragens planeadas)
- [x] Regras robustas de recorrência/planeamento
- [x] Checklists dinâmicas por tipo de ativo/plano
- [x] Métricas MTBF/MTTR por ativo

### 5) Ativos (Asset Management)

- [x] CRUD de ativos + categorias — ver backend/src/routes/asset.routes.ts, backend/src/routes/asset-category.routes.ts
- [ ] Ciclo de vida do ativo (custos, depreciação, substituições)
- [ ] Etiquetas QR/NFC (ativos/locais, abertura rápida de OT)

### 6) Stock & Compras

- [x] Stock/movimentos base — ver backend/src/routes/sparepart.routes.ts, backend/src/services/sparepart.service.ts, frontend/src/pages/SparePartsPage.tsx
- [x] Custos de stock ocultos por permissão (`stock:costs:read`) — ver frontend/src/pages/SparePartsPage.tsx, frontend/src/pages/StockEntryPage.tsx, frontend/src/pages/SparePartRegisterPage.tsx, frontend/src/pages/WorkOrdersPage.tsx (2026-02-13, commit ef083ef)
- [x] Reservas por ordem + kits — ver backend/src/routes/maintenancekit.routes.ts, frontend/src/pages/WorkOrdersPage.tsx, frontend/src/pages/MaintenanceKitsPage.tsx
- [x] Inventário avançado (mínimos + previsão + inventário por planta)
- [x] Compras & requisições (pedido interno → fornecedor → receção)

### 7) Documentos & Compliance

- [x] Biblioteca de documentos + upload/versionamento — ver backend/src/services/document.service.ts, backend/src/routes/alert.routes.ts, frontend/src/pages/SettingsPage.tsx
- [ ] Validade/certificações + alertas de expiração
- [ ] “Quality & Compliance” (calibrações/inspeções/ISO/evidências)

### 8) Notificações & Alertas

- [x] Alertas base + Settings — ver backend/src/services/alert.service.ts, backend/src/routes/alert.routes.ts, frontend/src/pages/SettingsPage.tsx
- [x] Notificações (in-app + socket) — ver backend/src/routes/notification.routes.ts, backend/src/services/notification.service.ts, frontend/src/pages/NotificationsPage.tsx, frontend/src/context/SocketContext.tsx
- [ ] Relatórios agendados por email
- [ ] Templates de notificação por tenant
- [ ] Email-to-WorkOrder (criar OT via email) → depende de “Integrações”

### 9) Integrações

- [ ] Integração ERP (export/import)
- [ ] Webhooks / API keys (tenant)
- [ ] Email-to-WorkOrder

### 10) Experiência (UX)

- [x] Dark mode / tema — ver frontend/src/context/ThemeContext.tsx, frontend/src/components/Header.tsx
- [ ] Dashboards por persona (admin/gestor/técnico/operador)
- [ ] PWA mobile offline-first (técnicos)
- [ ] Multi-idioma (pt/en/es)

---

## “Próximos passos” recomendados (para começar)

1. Fechar “Plataforma & Operações”: sessões + políticas de password (base para produto comercial).
2. Fechar “OT profissional”: workflow + evidências + timeline (o que mais vende).
3. Unificar “Planeamento”: calendário + alertas de atraso.


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

- [x] Auth + tenant scoping base (já existente no produto)
- [x] RBAC base (roles/permissões) + normalização/repair (inclui “Reparar RBAC” no SuperAdmin)
- [x] Hardening básico (helmet/rate limit) (ver roadmap 2026)
- [ ] Auditoria completa com diff por alteração (quem/antes/depois)
- [ ] Gestão de sessões (revogar sessões ativas, logs de login falhado)
- [ ] Políticas de segurança (password policy/lockout) → depende de “gestão de sessões”
- [ ] MFA (TOTP) por tenant

### 2) SuperAdmin (operações e suporte)

- [x] Seleção de empresa persistida (última escolhida / primeira) e sem “Global”
- [x] Consola SuperAdmin simplificada (sem navegação no topo; layout mais mobile)
- [x] Diagnósticos + exportações (bundle, integridade, drift, etc.) (base já existente)
- [x] Ferramenta “Reparar RBAC” (patch/seed)
- [ ] Health score por tenant + alertas
- [ ] Quarantine/read-only por tenant
- [ ] Sistema de Tickets (MVP) → ver [planning/ROADMAP_SUPERADMIN_TICKETS.md](planning/ROADMAP_SUPERADMIN_TICKETS.md)

### 3) Work Orders (OT) — “profissional”

- [x] Work orders base + SLA (existente)
- [ ] Workflow configurável (estados/transições/aprovações)
- [ ] Evidências completas (anexos/fotos antes/depois) → liga a “Documentos & Compliance”
- [ ] Timeline/audit legível de OT (derivada de audit logs)
- [ ] Templates de OT por tipo
- [ ] Relatório PDF (opcional)

### 4) Preventivas & Planeamento

- [x] Preventivas base + schedules (existente)
- [ ] Calendário unificado (preventivas + OTs + paragens planeadas)
- [ ] Regras robustas de recorrência/planeamento
- [ ] Checklists dinâmicas por tipo de ativo/plano
- [ ] Métricas MTBF/MTTR por ativo

### 5) Ativos (Asset Management)

- [x] CRUD de ativos + categorias (existente)
- [ ] Ciclo de vida do ativo (custos, depreciação, substituições)
- [ ] Etiquetas QR/NFC (ativos/locais, abertura rápida de OT)

### 6) Stock & Compras

- [x] Stock/movimentos base (existente)
- [x] Reservas por ordem + kits (ver roadmap 2026)
- [ ] Inventário avançado (lotes/localização/mínimos/reposição automática)
- [ ] Compras & requisições (pedido interno → fornecedor → receção)

### 7) Documentos & Compliance

- [x] Biblioteca de documentos + upload/versionamento (base existente)
- [ ] Validade/certificações + alertas de expiração
- [ ] “Quality & Compliance” (calibrações/inspeções/ISO/evidências)

### 8) Notificações & Alertas

- [x] Alertas base + Settings (ver roadmap 2026)
- [x] Notificações (in-app/socket) (ver roadmap 2026)
- [ ] Relatórios agendados por email
- [ ] Templates de notificação por tenant
- [ ] Email-to-WorkOrder (criar OT via email) → depende de “Integrações”

### 9) Integrações

- [ ] Integração ERP (export/import)
- [ ] Webhooks / API keys (tenant)
- [ ] Email-to-WorkOrder

### 10) Experiência (UX)

- [x] Dark mode / tema (base já existe)
- [ ] Dashboards por persona (admin/gestor/técnico/operador)
- [ ] PWA mobile offline-first (técnicos)
- [ ] Multi-idioma (pt/en/es)

---

## “Próximos passos” recomendados (para começar)

1. Fechar “Plataforma & Operações”: sessões + políticas de password (base para produto comercial).
2. Fechar “OT profissional”: workflow + evidências + timeline (o que mais vende).
3. Unificar “Planeamento”: calendário + alertas de atraso.


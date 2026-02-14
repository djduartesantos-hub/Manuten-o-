# Ordens de Trabalho — Timeline (Eventos) + SLA por `sla_rules`

**Data:** 14 February 2026  
**Objetivo:** tornar o histórico das Ordens de Trabalho mais “profissional” (timeline de eventos + notas) e alinhar o cálculo de SLA com a configuração central por tenant (`sla_rules`).

---

## 1) Timeline de eventos (`work_order_events`)

### Base de dados
- Migração: `scripts/database/migrations/025_create_work_order_events.sql`
- Tabela: `work_order_events`
  - `tenant_id`, `plant_id`, `work_order_id`
  - `event_type`, `message`, `meta` (jsonb)
  - `actor_user_id` (opcional), `created_at`
- Índices: por `work_order_id + created_at`, por tenant/plant, por `event_type`.

### Backend
- Schema/Drizzle: `backend/src/db/schema.ts`
- Rotas:
  - `GET /:plantId/work-orders/:workOrderId/events` — lista eventos (com join do utilizador, quando existir)
  - `POST /:plantId/work-orders/:workOrderId/events/note` — cria uma nota (`event_type = work_order_note`)
- Controller: `backend/src/controllers/workorder.controller.ts`
  - `logWorkOrderEvent(...)` é best-effort (falhas não quebram o fluxo principal).
  - Eventos registados automaticamente (best-effort) em:
    - criação de ordem (`work_order_created`)
    - mudança de estado (`work_order_status_changed`)
    - atribuição (`work_order_assigned`)
    - mudança de prioridade (`work_order_priority_changed`)
    - upload de anexo (`work_order_attachment_added`)
    - alterações gerais (ex: `notes`, `work_performed`) (`work_order_updated`, sem copiar texto completo)

### Frontend
- API: `frontend/src/services/api.ts`
  - `listWorkOrderEvents(plantId, workOrderId)`
  - `addWorkOrderNote(plantId, workOrderId, message)`
- UI: `frontend/src/pages/WorkOrdersPage.tsx`
  - Carrega audit + events em paralelo e rende `combinedTimeline`.
  - Inclui composer “Adicionar nota ao histórico” (apenas para quem pode operar a ordem).

---

## 2) SLA das Ordens por `sla_rules`

### O que mudou
- Antes: SLA de criação da Ordem era calculado por um mapa hardcoded (horas por prioridade).
- Agora: o SLA usa regras configuráveis por tenant na tabela `sla_rules`, alinhado com o modelo já usado em Tickets.

### Backend
- Utilitário: `backend/src/utils/workorder-sla-rules.ts`
  - `getWorkOrderSlaHours(tenantId, priority)` lê `sla_rules` para `entity_type = 'work_order'` e usa `resolution_time_hours`.
  - `computeWorkOrderSlaDeadline({ tenantId, priority, baseDate })` devolve a deadline.
- Integração: `backend/src/services/workorder.service.ts` (createWorkOrder)

### Notas
- Mantém defaults caso não exista regra ativa (baixa 96h, média 72h, alta 24h, crítica 8h).
- O sistema existente de pausa/exclusão de SLA continua a funcionar; este change foca-se na deadline inicial.

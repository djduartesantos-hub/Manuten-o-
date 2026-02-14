# Fase 3 — Planeamento (Calendário Unificado)

**Data:** 2026-02-14

## Objetivo
Disponibilizar uma vista única de planeamento por fábrica (planta) que consolida:
- Preventivas (agendamentos)
- Ordens de Trabalho (data agendada)
- Paragens planeadas (janela de indisponibilidade)

## Base de Dados
### Migração
- `scripts/database/migrations/026_create_planned_downtimes.sql`

### Tabela: `planned_downtimes`
Campos principais:
- `tenant_id`, `plant_id`
- `title`, `description`
- `start_at`, `end_at`
- `downtime_type`: `total | parcial`
- `downtime_category`: `producao | seguranca | energia | pecas | outras`

Regras:
- `end_at > start_at`
- checks de `type` e `category`

## Backend
### Rotas
Implementado em `backend/src/routes/planner.routes.ts`:
- `GET /api/:plantId/planner`
  - Requer: `schedules:read` + `workorders:read`
  - Query: `start` e `end` (ISO)
  - Retorna lista unificada ordenada por data

- `GET /api/:plantId/planned-downtimes`
  - Requer: `workorders:read`

- `POST /api/:plantId/planned-downtimes`
  - Requer: `workorders:write`

- `PUT /api/:plantId/planned-downtimes/:downtimeId`
  - Requer: `workorders:write`

- `DELETE /api/:plantId/planned-downtimes/:downtimeId`
  - Requer: `workorders:write`

### Controller
- `backend/src/controllers/planner.controller.ts`

Notas de implementação:
- Preventivas usam `scheduled_for` e, para visualização, assumem duração de 1h.
- Ordens usam `scheduled_date` e estimam duração a partir de `estimated_hours` (fallback 1h).
- Paragens planeadas são devolvidas quando sobrepõem o intervalo (`start_at < end` e `end_at > start`).

## Frontend
### Página
- `frontend/src/pages/PlannerPage.tsx`
  - Rota: `/planner`
  - Intervalo por defeito: hoje → +30 dias
  - Criação de paragem planeada (se `workorders:write`)
  - Export CSV do intervalo atual

### API Client
- `frontend/src/services/api.ts`
  - `listPlanner(plantId, { start, end })`
  - `createPlannedDowntime(plantId, payload)`

### Navegação
- Entrada “Planeamento” em `frontend/src/components/Header.tsx`

## Limitações (intencionalmente MVP)
- Vista em lista (por dia) em vez de grelha mensal.
- Sem edição de paragens planeadas no UI (API já suporta; remoção está disponível).
- Sem ligação direta (click-through) para abrir detalhes de OT/agendamento na mesma página.

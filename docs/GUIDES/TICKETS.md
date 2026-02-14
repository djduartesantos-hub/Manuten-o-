# 🎫 Módulo de Tickets (Suporte) — Escala 3 níveis

Este guia descreve as **novas funções** do módulo de Tickets, para depois integrares no README oficial.

---

## ✅ Objetivo
Criar um sistema interno de tickets para registar, acompanhar e escalar problemas/necessidades entre:

- **Fábrica (plant-scoped)** → operação local
- **Empresa (tenant-scoped)** → gestão / coordenação
- **SuperAdmin (global)** → suporte plataforma

Inclui **comentários**, **timeline/auditoria** e **notificações in-app**.

---

## 🔁 Fluxo de escala (Fábrica → Empresa → SuperAdmin)

### Nível: Fábrica
- Ticket criado associado a `plant_id`.
- Pode ser criado por qualquer utilizador com acesso à fábrica.
- Encaminhamento **para Empresa** só é permitido a utilizadores com permissão de encaminhar (via RBAC).

### Nível: Empresa
- Ticket aparece na caixa de entrada da empresa (sem `plant_id` obrigatório, mas preserva origem quando aplicável).
- Encaminhamento **para SuperAdmin** só é permitido a utilizadores com permissão de encaminhar (via RBAC).

### Nível: SuperAdmin
- Ticket aparece na caixa global do SuperAdmin (com filtro por tenant).
- Suporta comentários “internos” e atualização de estado (e outros campos expostos).

### Exceção: “Problema geral”
- Ao criar um ticket com `is_general=true`, ele é criado **direto no nível `superadmin`**.

---

## 🧭 Estados e níveis

- `status`: `aberto` | `em_progresso` | `resolvido` | `fechado`
- `level`: `fabrica` | `empresa` | `superadmin`

---

## 🔐 RBAC / Permissões

### Permissões adicionadas
- `tickets:read`
- `tickets:write`
- `tickets:forward`

As rotas aplicam `requirePermission(..., scope)` com `scope`:
- `plant` (fábrica)
- `tenant` (empresa)

### Nota de compatibilidade
Para evitar quebra após deploy em tenants ainda não “seeded/patch”, existe fallback de compatibilidade: se as permissões `tickets:*` ainda não existirem na tabela de permissões, o backend aplica regras legacy por role para este módulo (para não bloquear acesso). Ainda assim, **recomenda-se executar o patch RBAC** após deploy.

---

## 🖥️ UI (Front-end)

### Utilizadores (tenant)
- Página: `GET /tickets`
- Inclui:
  - Listagem com pesquisa (`q`), filtro por `status` e paginação (`limit/offset`)
  - Criar ticket (inclui opção “problema geral”)
  - Detalhe do ticket: descrição, comentários, timeline (eventos)
  - Ações: mudar estado e encaminhar (quando permitido)

### SuperAdmin
- Área: `GET /superadmin/suporte`
- Inclui:
  - Listagem de tickets do nível `superadmin` (filtrável por tenant)
  - Detalhe com comentários (opção “interno”) e atualização de estado

---

## 🔌 API (Back-end)

Base URL: `/api/...` (requer autenticação). O tenant é resolvido pelo middleware do backend.

### Fábrica (plant-scoped)
- `GET /api/plants/:plantId/tickets`
  - Query: `q`, `status`, `limit`, `offset`
- `POST /api/plants/:plantId/tickets`
  - Body:
    - `title` (string, 3-200)
    - `description` (string, 1-5000)
    - `is_general?` (boolean)
- `GET /api/plants/:plantId/tickets/:ticketId`
- `POST /api/plants/:plantId/tickets/:ticketId/comments`
  - Body: `body` (string, 1-4000)
- `PATCH /api/plants/:plantId/tickets/:ticketId/status`
  - Body: `status` (`aberto|em_progresso|resolvido|fechado`)
- `PATCH /api/plants/:plantId/tickets/:ticketId/forward`
  - Body: `note?` (string, até 2000)

### Empresa (tenant-scoped)
- `GET /api/tickets/company`
  - Query: `q`, `status`, `limit`, `offset`
- `GET /api/tickets/company/:ticketId`
- `POST /api/tickets/company/:ticketId/comments`
  - Body: `body`
- `PATCH /api/tickets/company/:ticketId/status`
  - Body: `status`
- `PATCH /api/tickets/company/:ticketId/forward`
  - Body: `note?`

### Backward-compat (V1)
- `GET /api/tickets?plantId=...`
- `POST /api/tickets?plantId=...`

### SuperAdmin
- `GET /api/superadmin/tickets`
  - (suporta filtros como `tenantId`, `q`, `status`, `level`, `limit`, `offset` conforme implementado no controller)
- `GET /api/superadmin/tickets/:ticketId`
- `PATCH /api/superadmin/tickets/:ticketId`
  - Body (parcial):
    - `status?`
    - `assigned_to_user_id?` (uuid | null)
    - `is_internal?` (boolean)
    - `level?` (`fabrica|empresa|superadmin`)
- `POST /api/superadmin/tickets/:ticketId/comments`
  - Body: `body`, `is_internal?`

---

## 🧾 Timeline / Auditoria

Cada ação relevante escreve eventos em `ticket_events` e estes são expostos no detalhe do ticket para mostrar:
- criação
- comentários
- mudanças de estado
- reencaminhamentos (forward)

---

## 🔔 Notificações (in-app)

Eventos de ticket disparam notificações (best-effort) via serviço de notificações:
- `ticket_created`
- `ticket_commented`
- `ticket_status_changed`
- `ticket_forwarded_to_company`
- `ticket_forwarded_to_superadmin`

---

## 🚀 Deploy / Operações (pós-deploy)

1) Executar migrações SQL (inclui as migrações do módulo Tickets):
- `POST /api/setup/migrate`

2) Garantir RBAC atualizado/semeado (inclui as permissões `tickets:*`):
- `POST /api/setup/patch/rbac`

Recomendação: executar (1) e depois (2). O fallback de compatibilidade reduz risco se o (2) atrasar, mas não substitui o patch.

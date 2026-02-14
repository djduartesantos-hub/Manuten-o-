# Funcionalidades adicionadas (commit 659664c)

Este documento descreve, de forma objetiva, o que entrou no commit **659664c** ("security policy, work order attachments, sessions").

## Visão geral

Entraram 3 funcionalidades principais:

1) **Política de segurança por tenant**
- Password policy (regras de complexidade)
- Login lockout (bloqueio temporário após falhas)
- Gestão via endpoints admin + UI em Settings

2) **Gestão de sessões do utilizador**
- Listar sessões ativas
- Revogar uma sessão específica
- Revogar todas as outras sessões
- “Touch” best-effort para registar atividade (`last_seen_at`)

3) **Anexos em Ordens de Trabalho (Work Orders)**
- Listagem de anexos
- Upload de ficheiros (evidências) via `multipart/form-data`
- Ficheiros servidos por `GET /uploads/*`

---

## 1) Política de segurança por tenant

### 1.1 Migração / Base de dados

Ficheiro: `scripts/database/migrations/024_create_tenant_security_policies.sql`

Cria a tabela `tenant_security_policies` (1 row por `tenant_id`) com os campos:
- Password policy:
  - `password_min_length`
  - `password_require_lower`
  - `password_require_upper`
  - `password_require_digit`
  - `password_require_special`
- Lockout policy:
  - `max_failed_logins`
  - `failed_login_window_minutes`
  - `lockout_minutes`
- Auditoria simples:
  - `updated_at`, `updated_by`

### 1.2 Backend: service

Ficheiro: `backend/src/services/security-policy.service.ts`

Símbolo: `SecurityPolicyService`

Métodos:
- `getDefaults(): TenantSecurityPolicy`
  - Defaults para bootstrap e para tenants sem registo.
- `getTenantPolicy(tenantId: string): Promise<TenantSecurityPolicy>`
  - Lê da tabela `tenant_security_policies`.
  - **Fail-open** (devolve defaults se a tabela não existir durante bootstrap).
- `validatePassword(password: string, policy: TenantSecurityPolicy): string | null`
  - Retorna `null` se cumprir a política; caso contrário retorna mensagem de erro.
- `upsertTenantPolicy({ tenantId, patch, actorUserId }): Promise<void>`
  - Upsert via SQL.
  - Mantém **semântica de PATCH**: defaults → existing (se existir) → patch.
- `getLoginLockoutStatus({ tenantId, username, policy }): Promise<{ locked; retryAfterSeconds; failures }>`
  - Calcula lockout com base na tabela `auth_login_events`.
  - Usa janela temporal (`failed_login_window_minutes`) e lockout (`lockout_minutes`).
  - **Fail-open** em erros (para evitar lockout acidental durante bootstrap).

### 1.3 Backend: controller + routes

Controller:
- Ficheiro: `backend/src/controllers/security.controller.ts`
- Funções:
  - `getTenantSecurityPolicy(req, res)`
  - `updateTenantSecurityPolicy(req, res)`
    - Faz audit log **best-effort** via `AuditService.createLog(...)`.

Routes (admin):
- Ficheiro: `backend/src/routes/admin.routes.ts`
- Endpoints:
  - `GET /admin/security-policy`
  - `PATCH /admin/security-policy`
- Guard:
  - `requirePermission('admin:users', 'tenant')`
- Validação:
  - `UpdateTenantSecurityPolicySchema` em `backend/src/schemas/validation.ts`

### 1.4 Enforcement (onde é aplicado)

1) Login (lockout)
- Ficheiro: `backend/src/controllers/auth.controller.ts`
- Fluxo:
  - Antes de validar credenciais: consulta `SecurityPolicyService.getLoginLockoutStatus(...)`
  - Se `locked: true`:
    - responde `429`
    - define header `Retry-After: <segundos>`

2) Troca de password (perfil)
- Ficheiro: `backend/src/controllers/profile.controller.ts`
- Aplica `SecurityPolicyService.validatePassword(...)` em `PATCH /profile/password`

3) Admin: criar utilizador e reset password
- Ficheiro: `backend/src/controllers/admin.controller.ts`
- `createUser(...)`
  - Se não vier password, gera uma temp password que satisfaça a política.
  - Valida a password final com `SecurityPolicyService.validatePassword(...)`.
- `resetUserPassword(...)`
  - Valida password pedida.

### 1.5 Frontend: API + UI

API client:
- Ficheiro: `frontend/src/services/api.ts`
- Tipo:
  - `TenantSecurityPolicy`
- Funções:
  - `getAdminSecurityPolicy(): Promise<TenantSecurityPolicy>` → `GET /admin/security-policy`
  - `updateAdminSecurityPolicy(patch): Promise<TenantSecurityPolicy>` → `PATCH /admin/security-policy`

UI:
- Ficheiro: `frontend/src/pages/SettingsPage.tsx`
- Adiciona um card/painel para editar e guardar a política.

---

## 2) Sessões (listar/revogar) + “touch”

### 2.1 Backend: service

Ficheiro: `backend/src/services/auth.service.ts`

Novas/alteradas:
- `touchSession(sessionId: string): Promise<void>`
  - Atualiza `auth_sessions.last_seen_at` com throttle (~5 min).
- `revokeSession(sessionId: string, revokedByUserId?): Promise<boolean>`
- `revokeSessionForUser({ tenantId, userId, sessionId, revokedByUserId? }): Promise<boolean>`
- `revokeAllOtherSessionsForUser({ tenantId, userId, currentSessionId?, revokedByUserId? }): Promise<number>`
- `revokeAllSessionsForUser(tenantId, userId, revokedByUserId?): Promise<number>`

### 2.2 Backend: middleware

Ficheiro: `backend/src/middlewares/auth.ts`

Mudança:
- Se o token incluir `sessionId`:
  - Verifica se a sessão está ativa (`AuthService.isSessionActive(...)`).
  - Faz `touchSession(sessionId)` best-effort.

### 2.3 Backend: endpoints de perfil

Ficheiro: `backend/src/routes/profile.routes.ts`

Novos endpoints:
- `GET /profile/sessions` → `ProfileController.listSessions`
- `POST /profile/sessions/revoke-others` → `ProfileController.revokeOtherSessions`
- `POST /profile/sessions/:sessionId/revoke` → `ProfileController.revokeSession`

Controller:
- Ficheiro: `backend/src/controllers/profile.controller.ts`
- Funções:
  - `listSessions(...)`
  - `revokeSession(...)`
  - `revokeOtherSessions(...)`

### 2.4 Frontend

API:
- Ficheiro: `frontend/src/services/api.ts`
- Funções:
  - `listMySessions()` → `GET /profile/sessions`
  - `revokeMySession(sessionId)` → `POST /profile/sessions/:sessionId/revoke`
  - `revokeOtherSessions()` → `POST /profile/sessions/revoke-others`

UI:
- Ficheiro: `frontend/src/pages/ProfilePage.tsx`
- Adiciona secção para:
  - ver sessões
  - terminar sessão atual (faz logout)
  - terminar outras sessões

---

## 3) Work Orders: anexos (evidências)

### 3.1 Backend: routes (multer)

Ficheiro: `backend/src/routes/workorder.routes.ts`

Endpoints novos:
- `GET /:plantId/work-orders/:workOrderId/attachments`
- `POST /:plantId/work-orders/:workOrderId/attachments`
  - `multipart/form-data` com campo `file`
  - limite: **10MB** (`limits.fileSize`)

Upload storage:
- Base dir: `backend/uploads` (resolvido via `../../uploads`)
- Estrutura:
  - `<uploadBaseDir>/<tenantId>/work-orders/<workOrderId>/...`

### 3.2 Backend: controller

Ficheiro: `backend/src/controllers/workorder.controller.ts`

Funções novas:
- helper `computeFileUrlFromUpload({ uploadBaseDir, file })`
- `WorkOrderController.listAttachments(req, res)`
  - Lê `attachments` e junta com `users` para devolver dados do uploader.
- `WorkOrderController.uploadAttachment(req, res)`
  - Guarda metadata em `attachments` + devolve `file_url`.

### 3.3 Servir ficheiros (uploads)

O backend expõe ficheiros por URL:
- `GET /uploads/*`

Implementação:
- Ficheiro: `backend/src/app.ts`
- Usa `express.static(.../uploads)`.

### 3.4 Frontend

API:
- Ficheiro: `frontend/src/services/api.ts`
- Tipo:
  - `WorkOrderAttachment`
- Funções:
  - `listWorkOrderAttachments(plantId, workOrderId)`
  - `uploadWorkOrderAttachment(plantId, workOrderId, file)`

UI:
- Ficheiro: `frontend/src/pages/WorkOrdersPage.tsx`
- Integra listagem e upload de anexos no detalhe/fluxo do Work Order.

---

## 4) Mudança pequena (tickets)

Ficheiro: `backend/src/controllers/tickets.controller.ts`

- Ajuste de lint: remoção de `Boolean(...)` redundante ao validar `is_general`.

---

## Checklist de validação rápida (manual)

1) Migrar DB
- Aplicar a migração `024_create_tenant_security_policies.sql`.

2) Política de segurança
- Em Settings (admin), abrir “Política de segurança”
- Alterar `password_min_length` e guardar
- Testar mudança de password (perfil) com password inválida → deve bloquear com mensagem
- Testar login com múltiplas falhas → deve responder 429 e `Retry-After`

3) Sessões
- Abrir Perfil → ver lista de sessões
- Revogar uma sessão (não atual) → deve desaparecer após reload
- Revogar sessão atual → deve fazer logout

4) Anexos Work Orders
- Abrir Work Order → fazer upload de um ficheiro
- Confirmar que devolve `file_url` e que o URL abre via `GET /uploads/...`

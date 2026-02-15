# Guia de Notificacoes e Integracoes (Sprint 3)

Este documento explica como usar as funcoes de notificacoes, templates, webhooks e API keys, incluindo os dados (tabelas/colunas) existentes no sistema.

## Resumo rapido

- Notificacoes in-app + email ja existem (regras, inbox e jobs).
- Templates por evento/canal permitem personalizar email e in-app.
- Webhooks e API keys permitem integracoes externas por tenant.
- Relatorios agendados por email ja estao ativos em Settings.

## Permissoes (RBAC)

Permissoes usadas:
- `notifications:read`, `notifications:write`
- `integrations:read`, `integrations:write`
- `reports:read` (relatorios agendados)

Notas:
- Admin/gestor tem `integrations:*` por defeito (seed).
- Superadmin ignora checks de permissao.

## Tabelas e campos (dados existentes)

### notification_rules
Regras de notificacao por tenant e evento.

Campos principais:
- `id` (uuid)
- `tenant_id`
- `event_type`
- `channels` (array: `in_app`, `socket`, `email`)
- `recipients` (array: `assigned`, `creator`, `managers`, `plant_users`)
- `is_active`
- `created_at`, `updated_at`

### notifications
Inbox de notificacoes por utilizador.

Campos principais:
- `id` (uuid)
- `tenant_id`
- `user_id`
- `plant_id`
- `event_type`
- `title`, `message`, `level`
- `entity`, `entity_id`, `meta`
- `is_read`, `read_at`, `created_at`

### notification_templates
Templates por evento/canal (tenant).

Campos principais:
- `id` (uuid)
- `tenant_id`
- `event_type`
- `channel` (`email`, `in_app`, `socket`)
- `subject` (opcional)
- `body`
- `is_active`
- `created_at`, `updated_at`

Variaveis suportadas no template:
- `{{title}}`, `{{message}}`, `{{eventType}}`, `{{entity}}`, `{{entityId}}`

### webhook_endpoints
Endpoints de webhook por tenant.

Campos principais:
- `id` (uuid)
- `tenant_id`
- `name`
- `url`
- `secret`
- `event_types` (array; vazio = todos)
- `headers` (json)
- `is_active`
- `created_by`
- `created_at`, `updated_at`

### webhook_events
Eventos registados para entrega.

Campos principais:
- `id` (uuid)
- `tenant_id`
- `event_type`
- `entity`, `entity_id`
- `payload` (json)
- `created_at`

### webhook_deliveries
Historico de entregas de webhook.

Campos principais:
- `id` (uuid)
- `tenant_id`
- `webhook_id`
- `event_id`
- `event_type`
- `status` (`pending`, `success`, `failed`)
- `attempt_count`
- `last_attempt_at`, `next_attempt_at`
- `response_status`, `response_body`, `error`
- `created_at`, `updated_at`

### api_keys
Chaves de API por tenant.

Campos principais:
- `id` (uuid)
- `tenant_id`
- `name`
- `key_prefix`
- `key_hash`
- `scopes` (array de permissoes)
- `last_used_at`, `expires_at`
- `is_active`
- `created_by`
- `created_at`, `updated_at`

### scheduled_reports
Relatorios agendados por email.

Campos principais:
- `id` (uuid)
- `tenant_id`
- `user_id`
- `name`, `description`
- `frequency` (`daily`, `weekly`, `monthly`)
- `send_day`, `send_time`
- `recipients` (array de emails)
- `report_type` (`summary`, `detailed`, `kpi`, `maintenance`, `inventory`)
- `include_charts`, `include_data`
- `is_active`
- `last_sent_at`, `next_send_at`
- `created_at`, `updated_at`

## API: Notificacoes

Base URL: `/api/notifications`

### Regras
- `GET /rules`
- `PUT /rules`

Payload exemplo (PUT):
```json
{
  "rules": [
    {
      "event_type": "work_order_status_changed",
      "channels": ["in_app", "socket", "email"],
      "recipients": ["assigned", "creator", "managers"],
      "is_active": true
    }
  ]
}
```

### Inbox
- `GET /inbox?limit=50&offset=0&unreadOnly=true|false`
- `PATCH /inbox/read-all`
- `PATCH /inbox/:notificationId/read`
- `PATCH /inbox/:notificationId/unread`
- `DELETE /inbox` (limpa)
- `DELETE /inbox/:notificationId`

### Templates
- `GET /templates`
- `POST /templates`
- `PATCH /templates/:templateId`
- `DELETE /templates/:templateId`

Payload exemplo (POST):
```json
{
  "eventType": "work_order_status_changed",
  "channel": "email",
  "subject": "Ordem atualizada",
  "body": "{{title}} - {{message}}",
  "isActive": true
}
```

## API: Integracoes (webhooks + api keys)

Base URL: `/api/integrations`

### Webhooks
- `GET /webhooks`
- `POST /webhooks`
- `PATCH /webhooks/:webhookId`
- `DELETE /webhooks/:webhookId`
- `GET /webhooks/events?limit=50`
- `GET /webhooks/deliveries?webhookId=...&limit=50`

Payload exemplo (POST):
```json
{
  "name": "ERP Hook",
  "url": "https://example.com/webhook",
  "eventTypes": ["work_order_status_changed"],
  "headers": {"X-Source": "cmms"},
  "isActive": true,
  "secret": "opcional"
}
```

### API Keys
- `GET /api-keys`
- `POST /api-keys`
- `PATCH /api-keys/:apiKeyId`
- `DELETE /api-keys/:apiKeyId`

Payload exemplo (POST):
```json
{
  "name": "ERP Key",
  "scopes": ["assets:read", "workorders:write"],
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "isActive": true
}
```

Resposta inclui o token gerado apenas uma vez:
```json
{
  "success": true,
  "data": {
    "apiKey": "mk_...",
    "record": {"id": "...", "key_prefix": "mk_..."}
  }
}
```

## UI: Onde configurar

### Settings > Notificacoes do sistema
- Regras por evento (canais e destinatarios)
- Templates (email/in-app)
- Relatorios agendados

### Settings > Integracoes
- Webhooks (criar, ativar, eliminar)
- API keys (criar, ativar, eliminar)

## Jobs e emails

- Emails usam o job `send-email` (queue `email`).
- Templates email sao aplicados automaticamente quando existem para o evento.
- Relatorios agendados sao processados pelo scheduler interno e enviados por email.

## Migracoes

- Nova migracao: `033_create_notifications_integrations.sql`
- Inclui: templates, webhooks, deliveries, api keys e scheduled_reports.

## Testes

- `backend/tests/integrations.endpoints.test.ts`
  - Cria e lista templates, webhooks e api keys.

## Eventos existentes (sistema)

Eventos suportados (regras):
- `work_order_status_changed`
- `work_order_assigned`
- `sla_overdue`
- `stock_low`
- `preventive_overdue`
- `asset_critical`
- `recurring_issue`

## Observacoes

- Webhook delivery worker ainda nao esta implementado (pendente para Sprint 3 Ops/Qualidade).
- API keys estao prontas para autenticacao via hash, mas middleware de validacao ainda nao foi adicionado.


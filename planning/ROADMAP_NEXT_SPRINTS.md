# Roadmap de Execucao (Sprints)

Objetivo: consolidar o backlog pendente em sprints claros para orientar o desenvolvimento.

## Sprint 1 - Seguranca base e auditoria

### BD
- Adicionar tabela para diff/audit (antes/depois) ou colunas de diff em audit logs.
- Criar tabela/config de retencao (por tenant + defaults).
- Guardar politicas de password/lockout por tenant.
- Guardar segredos TOTP (por user/tenant) com rotacao.

### API
- Registar diff em todos os updates criticos (OT, assets, stock, compras, RBAC, tickets).
- Endpoint para configurar retencao e job de limpeza.
- Validacoes de password/lockout (tentativas falhadas, cooldown, expiracao opcional).
- Endpoints para setup/verify/reset MFA TOTP.

### UI
- Painel de auditoria com diff e filtros (por usuario/entidade/data).
- Settings para politicas de password/lockout e retencao.
- Setup MFA no perfil (ativar/desativar, QR, backup codes).

### Ops/Qualidade
- Migracoes e backfill de audit logs.
- Testes: RBAC e fluxo de login com lockout + MFA.
- Observabilidade: alertas para lockout e falhas de MFA.

## Sprint 2 - Compliance e ativos (core operacional)

### BD
- Tabelas de certificacoes, validade, e historico de inspecoes.
- Entidades de calibracao/ISO e ligacao a ativos/documentos.
- Campos de ciclo de vida (custo, deprec, datas, substituicoes).
- Tabela de etiquetas QR/NFC e relacao com ativos/locais.

### API
- CRUD de certificacoes, inspecoes, calibracoes e evidencias.
- Regras de expiracao e alertas.
- CRUD de ciclo de vida do ativo.
- Resolver QR/NFC para abrir ativo/OT.

### UI
- Paginas de compliance (inspecoes, calibracoes, validade).
- Secao de ciclo de vida no detalhe do ativo.
- Gerador/gestor de etiquetas QR/NFC e scan rapido.

### Ops/Qualidade
- Seeds de exemplo para compliance.
- Testes: alertas de expiracao e permissao por role.

## Sprint 3 - Notificacoes e integracoes (crescimento)

### BD
- Tabelas de templates de notificacao por tenant.
- Tabelas de webhooks + API keys + eventos.
- Tabelas/filas de jobs para relatorios por email.

### API
- Gestao de templates e canais (email/in-app).
- Scheduler para relatorios (cron + queue).
- Email-to-WorkOrder (parsing + regras + anexos).
- CRUD de webhooks e API keys (scopes).
- Export/import ERP (primeira versao: stock/ativos/OT).

### UI
- Configuracao de templates e regras de notificacao.
- Agendamento de relatorios (frequencia, destinatarios).
- Painel de webhooks e API keys.

### Ops/Qualidade
- Integra email provider e queue (ex.: Redis).
- Testes de carga para jobs e webhooks.

## Sprint 4 - UX e mobilidade

### UI
- Dashboards por persona (admin/gestor/tecnico/operador).
- PWA offline-first (cache de OT/ativos/pecas + sync).
- Multi-idioma (pt/en/es) com chaves e fallback.

### API
- Endpoints otimizados para mobile (batch e delta sync).
- Flags de configuracao por tenant (idioma e PWA).

### Ops/Qualidade
- Lighthouse/PWA audits.
- Testes E2E mobile basicos.

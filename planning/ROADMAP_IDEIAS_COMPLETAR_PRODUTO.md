# Roadmap — Ideias para completar o produto (profissional / comercial)

Este documento é um “banco de ideias” orientado a tornar o produto mais completo (tipo CMMS profissional) sem perder a base multi-tenant e o SuperAdmin.

## 20 ideias novas (produto/mercado)
1. **Centro de configuração por plano** (features por subscrição, limites, add-ons).
2. **Módulo de SLA & tempos** (SLA por prioridade, MTTR/MTBF, cumprimento).
3. **Manutenção preditiva** (regras/alertas por sensor/leituras, import de CSV/IoT).
4. **App mobile PWA** (offline-first para técnicos: ordens, checklists, fotos).
5. **Checklists dinâmicas** (templates por tipo de ativo, assinaturas, anexos).
6. **Gestão documental** (manuais, fichas, certificações com validade e alertas).
7. **Ciclo de vida do ativo** (depreciação, custos, histórico, substituições).
8. **Workflows configuráveis** (estados de OT, aprovações, escalonamentos).
9. **Inventário avançado** (lotes, localização, mínimos, reposição automática).
10. **Compras & requisições** (pedidos internos → fornecedores → receção).
11. **Calendário unificado** (preventivas + OTs + paragens planeadas).
12. **Dashboards por persona** (admin/gestor/técnico/operador).
13. **Relatórios agendados** (email + anexos + templates).
14. **Auditoria completa** (diff por alteração, quem/antes/depois).
15. **Políticas de segurança** (MFA, password policy, lockout, sessões).
16. **Integração ERP** (export/import de custos, ativos, fornecedores).
17. **Integração Email-to-WorkOrder** (criar OT via email).
18. **Multi-idioma** (pt/en/es) com dicionário por tenant.
19. **Etiquetas QR/NFC** (ativos/locais, abertura rápida de OT).
20. **“Quality & Compliance”** (calibrações, inspeções, ISO, evidências).

---

## SuperAdmin — 20 ideias por página

### SuperAdmin / Dashboard (20)
1. KPI de receita/planos por empresa (se existir billing).
2. Atividade por canal (web/mobile/api).
3. Top empresas por risco (integridade + anomalias + drift).
4. Alertas: empresas sem fábricas/users.
5. Tendência 30/90/180 dias (logins, OTs, preventivas).
6. Filtros por plano/subscrição.
7. Export “snapshot” diário.
8. Score de “adoção” por empresa.
9. Score de “higiene de dados” por empresa.
10. Lista de incidentes ativos.
11. Métricas de latência do backend.
12. Status de jobs/queues.
13. Utilização de storage (uploads).
14. Consumo de email/notifications.
15. Gráfico de crescimento (tenants/users/assets).
16. “Churn” (empresas inativas > X dias).
17. Indicadores de setup incompleto.
18. Heatmap de atividade por hora.
19. Detetar tenants “demo” vs “prod”.
20. “Top queries” (se tiver logging).

### SuperAdmin / Empresas (20)
1. Campos de faturação + plano + limites.
2. Ações: suspender/reativar com motivo.
3. Import/Export de configuração de tenant.
4. Clone de tenant (para demos).
5. Validação de slug/uniqueness com sugestões.
6. “Safe delete” (soft-delete + restore).
7. Gestão de domínios (SSO futuramente).
8. Limites por tenant (assets, users, plants).
9. Feature flags por tenant.
10. Atribuir responsável interno (CSM).
11. Histórico de alterações (audit diff).
12. Indicador de “health score”.
13. Acesso rápido ao bundle diagnóstico.
14. Notas internas (suporte).
15. Export completo do tenant (GDPR export).
16. Migrações/patch status por tenant.
17. Verificação de e-mail entregues (bounces).
18. Dados de onboarding (passos concluídos).
19. Templates de notificações por tenant.
20. Estado de integrações externas.

### SuperAdmin / Fábricas (20)
1. Listagem global de fábricas por tenant.
2. Ranking de fábricas por atrasos.
3. Mapa (GPS opcional) / zonas.
4. Capacidade de técnicos por fábrica.
5. Taxa de conclusão preventivas por fábrica.
6. Export por fábrica (assets/OTs/stock).
7. Deteção de fábricas “fantasma” (sem assets).
8. Auditoria de mudanças de planta.
9. Regras de SLA por fábrica.
10. Templates de checklist por fábrica.
11. Multi-língua por fábrica.
12. Atribuição de supervisor de fábrica.
13. Calendar view por fábrica.
14. “Downtime” tracking.
15. Custos por fábrica.
16. Integração com turnos.
17. Limites por fábrica.
18. Perfis de notificação por fábrica.
19. Gestão de locais internos (zonas/linhas).
20. Matriz de permissões por fábrica.

### SuperAdmin / Utilizadores + RBAC (20)
1. Política de password por tenant.
2. MFA (TOTP) por tenant.
3. Sessões ativas + revogar.
4. “Impersonation” (com auditoria) — futuro.
5. Export RBAC (csv/json) por tenant.
6. Detetar permissões excessivas.
7. Detetar contas inativas.
8. Detetar emails duplicados.
9. Regras de lockout.
10. “Break glass account”.
11. Gestão de convites (invite flow).
12. Provisionamento SCIM (futuro).
13. Logs de login falhado.
14. Rate-limit por tenant.
15. Matriz RBAC completa (paginação).
16. “Role templates” por tipo de empresa.
17. “Least privilege” wizard.
18. Auditoria de alterações RBAC (diff).
19. Export utilizadores/roles.
20. Alertas de drift automáticos.

### SuperAdmin / Atualizações (20)
1. Histórico de migrações por tenant.
2. “Dry-run checks” antes de patch.
3. Aplicar patches por batch.
4. Rollback (quando possível).
5. Detetar drift de schema.
6. Diff de schema por tenant.
7. Monitor de setup-db-runs.
8. Export de setup runs.
9. Alertas de falhas de migração.
10. Limites para evitar operações perigosas.
11. Logs de execução.
12. Botão “ver SQL” (read-only).
13. Checklist automática de pós-migração.
14. Verificação de integridade pós-migração.
15. Auditoria de quem executou.
16. “Maintenance window” configurável.
17. Notificação aos admins do tenant.
18. Gerar bundle automaticamente.
19. Repetir patch idempotente.
20. Marcar tenant como “needs attention”.

### SuperAdmin / Suporte (20)
1. “Diagnostics bundle” agendado.
2. Upload de logs (com redaction).
3. Export GDPR (tenant).
4. Ferramenta de pesquisa global (users/assets/OTs).
5. “Data repair” assistido (com preview).
6. Reindex (se houver search).
7. Ferramenta de performance (slow queries).
8. Auditoria avançada com filtros.
9. Purge seletivo por ação.
10. Tool de email test.
11. Tool de notificações test.
12. Tool de integridade com detalhes.
13. Tool de RBAC drift com sugestões.
14. Tool de segurança com recomendações.
15. ✅ “Quarantine tenant” (read-only mode).
16. Export multi-format (zip com múltiplos CSV).
17. Captura de ambiente (versões).
18. SLA interno por ticket.
19. Automação de incidentes.
20. Escalonamento para engenharia.

---

## Admin Empresa (tenant) — 20 ideias por página

### Dashboard (20)
1. KPI: OTs abertas/atrasadas.
2. KPI: preventivas semanais.
3. KPI: custos (mão de obra + peças).
4. KPI: MTTR/MTBF por ativo.
5. Heatmap por fábrica.
6. Alertas de stock mínimo.
7. Alertas de compliance.
8. Top ativos por falhas.
9. Top técnicos por carga.
10. Tendência 30/90 dias.
11. Relatórios “1 clique”.
12. Widgets configuráveis.
13. Metas por mês.
14. SLA por prioridade.
15. Backlog aging.
16. “Risco operacional” score.
17. Export PDF.
18. Notificações in-app.
19. “O que mudou” (changelog).
20. Ajuda contextual.

### Fábricas (20)
1. Estrutura de locais (zonas/linhas).
2. Mapa de fábrica (planta).
3. Turnos e escalas.
4. Calendário de paragens.
5. Políticas de acesso por fábrica.
6. Relatório de produtividade.
7. Definir responsáveis.
8. Inventário por fábrica.
9. Templates de planos por fábrica.
10. Import/export de assets.
11. Alertas por fábrica.
12. Custos por fábrica.
13. KPIs por fábrica.
14. Auditoria por fábrica.
15. SLA por fábrica.
16. “Fábrica em manutenção” modo.
17. Links rápidos.
18. Ajustes de timezone.
19. Integrações por fábrica.
20. Backup/export.

### Utilizadores (20)
1. Convites por email.
2. Permissões por fábrica.
3. Perfis (técnico/operador).
4. Gestão de equipas.
5. Onboarding por role.
6. Política de passwords.
7. MFA opcional.
8. Sessões ativas.
9. Logs de login.
10. Limites de acesso.
11. Auditoria de mudanças.
12. Templates de roles.
13. Import de utilizadores.
14. Export de utilizadores.
15. “Training required” flag.
16. Certificações do técnico.
17. Turnos.
18. Notificações por user.
19. Delegações/ausências.
20. Regras de escalonamento.

### Configurações / Setup (20)
1. Definir prioridades e SLAs.
2. Estados da OT configuráveis.
3. Tipos de manutenção.
4. Categorias de ativos.
5. Tags globais.
6. Email templates.
7. Notificações (regras).
8. Integração com SMTP.
9. Webhooks.
10. API keys.
11. Audit retention.
12. Data retention.
13. Backups.
14. Export/import config.
15. Feature flags.
16. Limites por plano.
17. Branding (logo/cores).
18. Multi-idioma.
19. Timezone.
20. Calendário de feriados.

---

## Admin Fábrica (plant) — 20 ideias por página

### Assets (20)
1. QR/NFC por asset.
2. Componentes/sub-assets.
3. Contadores/leituras.
4. Documentos anexos.
5. Histórico completo.
6. Custos por asset.
7. Garantias.
8. Localização interna.
9. Criticidade.
10. Planos associados.
11. Peças compatíveis.
12. Fotografia/diagramas.
13. Checklists por asset.
14. Inspeções.
15. Calibrações.
16. Alertas por leitura.
17. Auditoria de alterações.
18. Import massivo.
19. Export.
20. Depreciação.

### Ordens de Trabalho (20)
1. Aprovação por custo.
2. SLA por prioridade.
3. Checklists e evidências.
4. Fotos antes/depois.
5. Assinatura.
6. Timesheets.
7. Peças consumidas.
8. Causa raiz.
9. Paragens.
10. Templates.
11. Workflows.
12. Reabertura.
13. Automação (regras).
14. Email-to-OT.
15. Comentários.
16. Menções.
17. Export PDF.
18. Integração calendário.
19. Escalonamento.
20. KPI por técnico.

### Stock / Peças (20)
1. Mínimos por localização.
2. Transferências entre fábricas.
3. Inventário cíclico.
4. Lotes/validade.
5. Requisições.
6. Compras.
7. Receção.
8. Devoluções.
9. Consumo por OT.
10. Alertas.
11. Fornecedores.
12. Preços por fornecedor.
13. Substitutos.
14. Relatório ABC.
15. Ajustes.
16. Auditoria.
17. Import/export.
18. Integração ERP.
19. Código de barras.
20. Custos.

---

## Roles — 20 ideias por role

### SuperAdmin (20)
1. Config central de feature flags.
2. Gestão de planos/subscrição.
3. Health score por tenant.
4. ✅ Quarentena (read-only).
5. Bundles automáticos.
6. Export global multi-tenant.
7. Auditoria avançada.
8. Gestão de incidentes.
9. Ferramenta de reparação de dados.
10. Migrações por batch.
11. Drift de schema.
12. Gestão de chaves API por tenant.
13. Limites e quotas.
14. Gestão de backups.
15. Controlo de retenção.
16. Políticas de segurança.
17. Monitor jobs.
18. Diagnósticos de performance.
19. Ferramentas de suporte a utilizadores.
20. Integrações e webhooks.

### Admin Empresa (20)
1. Configurar regras de OT.
2. Criar templates de planos.
3. Gestão de equipas.
4. Import/export.
5. Branding.
6. Auditoria.
7. Regras de notificação.
8. Feriados.
9. Calendário.
10. SLAs.
11. Aprovações.
12. Custos.
13. Integrações.
14. API keys.
15. Data retention.
16. Backups.
17. Gestão de fornecedores.
18. Gestão de stock.
19. Relatórios agendados.
20. Segurança (MFA/policy).

### Gestor de Manutenção (gestor_manutencao) (20)
1. Planeamento semanal.
2. Balanceamento de carga.
3. Aprovar OTs.
4. KPIs MTTR/MTBF.
5. Gestão de backlog.
6. Priorização.
7. Root cause.
8. Auditoria.
9. Relatórios.
10. Revisão preventivas.
11. Gestão de stock crítico.
12. Gestão de contratos.
13. Calendário paragens.
14. Equipa.
15. Escalonamento.
16. Notificações.
17. Templates.
18. “Quality checks”.
19. Custos.
20. Treino/certificações.

### Supervisor (20)
1. Validar execução.
2. Aprovar custos.
3. Reporte de incidentes.
4. Checklist compliance.
5. Escalas.
6. KPI por equipa.
7. Auditoria.
8. Aprovar mudanças em planos.
9. Gestão de paragens.
10. Dashboard de fábrica.
11. Integração com turnos.
12. Alertas.
13. Revisão de stock.
14. Gestão de fornecedores.
15. Gestão de documentos.
16. Gestão de inspeções.
17. Feedback loop.
18. SLA.
19. Melhorias contínuas.
20. Export.

### Técnico (tecnico) (20)
1. PWA offline.
2. Checklists.
3. Fotos.
4. Assinatura.
5. QR scan.
6. Peças consumidas.
7. Timesheet.
8. Comentários.
9. Atribuição/aceitação.
10. Rotas.
11. Materiais.
12. Segurança (EPI).
13. Procedimentos.
14. Histórico do asset.
15. Sugestões de diagnóstico.
16. Reabertura.
17. Notificações.
18. Work instructions.
19. Integração calendário.
20. Export relatório.

### Operador (operador) (20)
1. Abrir OT rápido.
2. Report incident.
3. QR scan.
4. Ver status.
5. Comunicação.
6. Upload foto.
7. Checklist simples.
8. Notificações.
9. Canal de feedback.
10. Solicitação de material.
11. Sugestão de melhoria.
12. “Paragem” report.
13. Validação após reparo.
14. Histórico básico.
15. Segurança.
16. Treino.
17. Acesso por área.
18. Preferências.
19. Ajuda.
20. Multi-idioma.

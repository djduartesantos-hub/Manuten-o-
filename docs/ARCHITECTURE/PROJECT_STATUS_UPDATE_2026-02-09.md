# Project Status Update — 2026-02-09

Este ficheiro existe para **capturar em detalhe** o que foi implementado recentemente (features, decisões, alterações de BD/API/UX), para depois atualizarmos o **README** e o **ROADMAP** que estão desatualizados.

- **Data:** 9 Fevereiro 2026
- **Versão base (docs):** 1.3.0-beta.2
- **Docs atuais (ROADMAP/STATUS) dizem “Última atualização: 4 Fev 2026”** — este documento descreve o que mudou desde então e também consolida mudanças relevantes feitas ao longo das últimas sessões.

---

## 1) TL;DR (o que mudou na prática)

### Navegação / UX
- O menu **Operações** ficou com **apenas “Ordens”**.
- **Planos** e **Preventivas agendadas** passaram a viver no **hub de Configurações (Settings)**.

### Preventivas (pacote “fábrica”)
- Ao **concluir** uma preventiva, o sistema pode **auto-criar o próximo agendamento** com base na periodicidade do plano.
- Frequência suportada em **dias, meses e horas**.
- Opções de governação e qualidade do agendamento:
  - base de cadência (por conclusão vs por data agendada),
  - janela de tolerância (soft vs hard),
  - proteção anti-duplicados (1 ativo por janela),
  - âncora de agendamento (fixo vs intervalo),
  - motivo obrigatório quando reagenda,
  - preview do próximo agendamento,
  - templates,
  - checklist/tarefas persistidas por plano.

### Deploy / Render
- Deploy ajustado para evitar **prompts interativos** em produção.
- Normalização de timestamps (ex.: `timestamptz` vs `timestamp`) para reduzir drift/erros de schema no Render.

### Ordens de trabalho (governança e rastreabilidade)
- **Sequência obrigatória de estados** aplicada no backend e refletida no frontend.
- Motivos obrigatórios:
  - **Pausa** → exige `pause_reason`
  - **Cancelamento** → exige `cancel_reason`
- **Concluir** exige:
  - checklist concluída,
  - e agora **“trabalho realizado”** obrigatório (`work_performed`).
- Introduzido registo de **paragem (downtime)** (início/fim/motivo) e cálculo de `downtime_minutes`.
- “SLA por fase” **informativo** no modal da ordem (tempos por etapa).
- Histórico/auditoria melhorado para evidenciar transições de estado.
- **SLA (pausa não conta):** notificações/alertas de SLA em atraso **não disparam durante `em_pausa`**; ao **retomar**, se o SLA já estiver em atraso, é emitida notificação.

### Relatórios
- **Export simples de downtime (por ativo + período)** em Relatórios (tipo “Downtime”), com export CSV/PDF usando os campos `downtime_*` das ordens (commit 25).

### Stock / Peças (operação)
- **Reservas de stock por Ordem de Trabalho**: criar/listar/libertar reservas por peça e ordem.
- **Kits de manutenção** (com itens): CRUD de kits + gestão de itens.
- **Integração nas Ordens**: ação manual “Aplicar kit” para criar reservas em massa.
- **Previsão simples de consumo**: horizonte em dias com estimativa (preventivas futuras + kits) e disponível projetado.

---

## 2) Referências rápidas (commits principais)

> Nota: a partir de agora começou uma convenção pedida: **commits com prefixo numérico** (ex.: `01 - ...`).

- `a389cb9` — navigation: mover Planos/Preventivas para Settings
- `848e16b` — preventive: auto-schedule próximo ciclo ao concluir
- `8208c06` — preventive: mostrar frequência + suportar auto-agendamento por horas
- `220e045` — deploy(db): drizzle push não-interativo + correção de timestamps
- `012c486` — preventive “pacote fábrica”: basis/tolerance/tasks/reason/templates/preview
- `13e8351` — work-orders: sequência obrigatória de estados
- `1b172c7` — 01 - work-orders: motivos pausa/cancel, downtime e SLA por fase
- `c1b3662` — 14 - preventive: schedule anchor fixed vs interval + db patch
- `89fec6d` — 13 - preventive: anti-duplicados (1 ativo por janela de tolerância)
- `9a994b8` — 12 - preventive: tolerância soft/hard + justificação obrigatória (modo hard) + db patch
- `b3457be` — 15 - docs: update project status (Fase 2 complete)
- `aee4330` — 16 - stock: reservations per work order + db patch
- `8fcc305` — 17 - kits: maintenance kits + db patch
- `99f53ac` — 18 - kits: frontend management page
- `0dabf98` — 19 - work-orders: apply maintenance kit to stock reservations
- `09881e3` — 21 - stock: spare parts forecast (preventives + kits)
- `cb62550` — 25 - reports: downtime export (por ativo + período)

---

## 3) Detalhe por área

### 3.1 Frontend — Navegação e Settings
**Objetivo:** limpar o menu de Operações e concentrar configuração no hub.

- **Operações**: ficou só com **Ordens**.
- **Planos** e **Preventivas** migraram para Settings.
- Rotas/páginas antigas foram removidas/encaminhadas para o painel de Settings (quando aplicável) para evitar “links mortos”.

**Impacto:**
- Menos dispersão de funcionalidades.
- Settings passa a ser a “fonte de verdade” de configuração.

---

### 3.2 Preventivas — auto-agendamento e pacote “fábrica”

#### Auto-agendamento do próximo ciclo
- Ao concluir uma preventiva (schedule), o backend cria automaticamente o próximo schedule quando:
  - o plano está com `auto_schedule` ativo,
  - há uma periodicidade válida,
  - e não existe já um schedule equivalente no intervalo esperado (proteção contra duplicados).

#### Frequências suportadas
- **Dias**
- **Meses**
- **Horas** (útil para rotinas curtas em contexto fabril)

#### Cadência (schedule basis)
- Introduzido conceito de base de cadência:
  - **`completion`**: próxima preventiva calcula a partir da data de conclusão
  - **`scheduled`**: próxima preventiva calcula a partir da data agendada

Isto reduz drift de calendário dependendo do tipo de operação.

#### Janela de tolerância (informativa)
- Configuração para tolerância antes/depois (em dias/horas conforme definido)

**Modos:**
- **`soft`**: tolerância informativa (sem bloqueio)
- **`hard`**: ao **concluir** fora da janela, exige **justificação** nas notas (`notes`) do agendamento

Isto garante disciplina quando necessário, sem impor bloqueio por defeito.

**Notas operacionais:**
- A coluna `tolerance_mode` é aplicada por plano e exposta no UI.
- Foi incluído patch idempotente para adicionar `maintenance_plans.tolerance_mode` via a página “Atualizar Base de Dados”.

#### Proteção anti-duplicados (1 ativo por janela)
- Ao concluir e auto-gerar o próximo schedule, o backend verifica se já existe um schedule **ativo** para o mesmo plano dentro da janela de tolerância do “próximo” (intervalo `[nextDate - tolerance_before, nextDate + tolerance_after]`).
- Se existir, **não cria duplicado**.

#### Âncora de agendamento (fixo vs intervalo)
Introduzido `schedule_anchor_mode` no plano:
- **`interval`**: cadência baseada na data agendada atual (permite drift quando há reagendamentos)
- **`fixed`**: cadência baseada na âncora original (`rescheduled_from` quando existe) para manter um “dia/hora alvo” estável

**Notas operacionais:**
- `rescheduled_from` é preservado (não é sobrescrito em reagendamentos seguintes), para manter a âncora.
- Incluído patch idempotente para adicionar `maintenance_plans.schedule_anchor_mode` via “Atualizar Base de Dados”.

#### Reagendamento com motivo obrigatório
- Sempre que uma preventiva fica em estado “reagendada”, o frontend exige `reschedule_reason` e o backend valida.

#### Preview do próximo agendamento
- Ao editar/gerir preventivas/plano, o UI exibe um preview do “próximo” para reduzir erros humanos.

#### Templates
- Templates de configuração para acelerar criação de planos/schedules.

#### Checklist/tarefas persistidas por plano
- Tarefas/checklist são persistidas e reaproveitadas por schedules criados automaticamente.

---

### 3.3 Backend/DB — ajustes para deploy (Render)

- Ajustado o processo de DB sync/migrations para **não pedir confirmação interativa** em produção.
- Alinhados timestamps para reduzir conflitos de schema em Postgres (Render), especialmente em colunas com/sem timezone.

---

### 3.4 Ordens — máquina de estados e governança

#### Sequência obrigatória de estados
Estados normalizados usados:
- `aberta` → `em_analise` → `em_execucao` → `concluida` → `fechada`

Exceções:
- `em_pausa` (apenas durante execução; volta para execução)
- `cancelada` (permitido a partir de qualquer estado não-final)

**Regra:** estados finais (`fechada`, `cancelada`) não permitem transições.

#### Motivos obrigatórios
- Se a ordem passar para `em_pausa`, exige **motivo de pausa**.
- Se a ordem passar para `cancelada`, exige **motivo de cancelamento**.

#### Requisitos de conclusão
Ao concluir (`concluida`):
- todas as tarefas devem estar concluídas,
- `work_performed` passa a ser obrigatório (mínimo prático).

#### Downtime / Paragem
Foram adicionados campos para paragem:
- `downtime_started_at`
- `downtime_ended_at`
- `downtime_minutes`
- `downtime_reason`

O backend calcula `downtime_minutes` quando início/fim são fornecidos.

#### SLA por fase (informativo)
No modal da ordem no frontend existe um cartão “SLA por fase (informativo)” com:
- Abertura → Análise
- Análise → Execução
- Execução → Conclusão
- Paragem

#### SLA: “tempo em pausa não conta” (comportamento de alertas)
Para alinhar com o track “Fábrica + Gestão” (Fase 4 — Alertas/SLA), foi aplicado um comportamento simples e seguro:
- **Enquanto a ordem está em `em_pausa`**, o sistema **não emite** notificações/alertas periódicos de “SLA em atraso”.
- **Ao retomar** (`em_pausa` → `em_execucao`), se o `sla_deadline` já estiver no passado, o sistema emite uma notificação de “SLA em atraso”.

Isto evita ruído durante pausas (por exemplo, “aguardando peças”) e concentra o alerta no momento em que o trabalho recomeça.

#### Auditoria / Timeline
O frontend já apresentava “Histórico de alterações” via audit logs; foi melhorado para mostrar claramente:
- **Estado: X → Y** quando a mudança envolve `status`.

---

### 3.5 Stock/Peças — reservas por ordem + kits

#### Reservas de stock por ordem
- Introduzida a capacidade de **reservar stock por Ordem de Trabalho** (sem consumo automático).
- A reserva reduz o **stock disponível** (disponível = stock − reservado ativo).
- Operação pensada para chão de fábrica:
  - criar reserva manualmente,
  - ver reservas da ordem,
  - libertar reservas quando já não são necessárias.

**Notas operacionais**
- Não foram adicionadas “regras extra” (automatismos avançados) por pedido — mantemos a operação manual e explícita.

#### Kits de manutenção (ecrã de gestão)
- Implementados **Kits de manutenção** com:
  - cabeçalho do kit (`maintenance_kits`) e itens (`maintenance_kit_items`),
  - regra: kit pode ser associado a `plan_id` **ou** `category_id` (não ambos),
  - abordagem de itens **replace-all** (determinística) no endpoint de upsert.
- Adicionados patches idempotentes + botão na página de atualização da BD (padrão do projeto).

#### Integração nas Ordens: “Aplicar kit”
- Na secção **Reservas de stock** das Ordens existe agora uma ação manual **Aplicar kit**:
  - seleciona um kit ativo,
  - cria reservas para cada item do kit,
  - mostra feedback de sucesso total/parcial.

#### Previsão simples de consumo (preventivas futuras + kits)
- Adicionada uma **previsão simples** em Inventário → Peças, focada no essencial (sem ML):
  - escolhe um horizonte (dias),
  - o backend conta preventivas com estado `agendada`/`reagendada` no período,
  - multiplica pelos itens dos kits ativos (por `plan_id`, com fallback a `category_id` quando não há kit por plano),
  - calcula por peça: stock atual, reservado ativo, previsto e disponível projetado.
- Endpoint: `GET /api/tenants/:plantId/spareparts/forecast?days=30`

---

## 4) Alterações de Schema (resumo)

### Preventivas
- Novas colunas relacionadas com cadência/tolerância e motivo de reagendamento (tabelas de planos e schedules).

### Work Orders
Campos adicionados (work_orders):
- `analysis_started_at`
- `paused_at`, `pause_reason`
- `cancelled_at`, `cancel_reason`
- `downtime_started_at`, `downtime_ended_at`, `downtime_minutes`, `downtime_reason`

### Stock / Peças
- Nova tabela `stock_reservations`
- Novas tabelas `maintenance_kits` e `maintenance_kit_items`

---

## 5) Compatibilidade e impacto

- As validações novas (motivos e trabalho realizado) introduzem **novos requisitos** para o frontend.
  - Onde há UI atualizada: fluxo já cobre.
  - Se existirem clientes/frontends antigos: podem começar a receber 400 ao tentar pausar/cancelar/concluir sem os novos campos.

- As alterações de schema implicam **drizzle push/migrations** no ambiente.

---

## 6) Pontos pendentes / próximos passos (para o ROADMAP)

Sugestões concretas para atualizar ROADMAP/README com base no que já está feito:

1) **Atualizar datas e status**
   - ROADMAP e DEVELOPMENT_STATUS ainda indicam “4 Fevereiro 2026”.

2) **Adicionar explicitamente ao roadmap (operacional / fábrica)**
   - Preventivas: cadência por conclusão vs agendada, tolerância, motivo ao reagendar, checklist persistida, templates.
   - Ordens: máquina de estados, motivos obrigatórios, downtime, SLA por fase informativo, requisitos de conclusão.

3) **Backlog que ficou para uma fase seguinte**
- Tolerância: clarificar no ROADMAP que o modo **hard** existe e a regra é “exige justificação fora da janela” (em vez de um bloqueio total sem escape).
   - Meter readings / gatilhos por contador (há base no schema, mas não é foco deste pacote).

---

## 7) Onde procurar no código (atalhos)

Frontend:
- Ordens (UI principal): `frontend/src/pages/WorkOrdersPage.tsx`
- Kits (UI de gestão): `frontend/src/pages/MaintenanceKitsPage.tsx`
- Settings hub: `frontend/src/pages/SettingsPage.tsx`

Backend:
- Controlador de ordens: `backend/src/controllers/workorder.controller.ts`
- Service de ordens: `backend/src/services/workorder.service.ts`
- Service de reservas: `backend/src/services/stockreservation.service.ts`
- Controller/Service de kits: `backend/src/controllers/maintenancekit.controller.ts`, `backend/src/services/maintenancekit.service.ts`
- Schema Drizzle: `backend/src/db/schema.ts`

---

## 8) Nota de manutenção

Este documento deve ser atualizado sempre que:
- uma feature “grande” entrar (muda UX/fluxo),
- houver alteração de schema,
- ou houver mudança operacional (deploy/migrations).

---

## 9) Roadmap (draft) — melhorias por fases

Este roadmap é um **draft prático**, alinhado com chão de fábrica **e** gestão. Não substitui ainda o ROADMAP oficial; serve para escolhermos prioridades e depois atualizarmos o documento antigo.

### Fase 0 — Quick Wins (sem grandes migrações)

**Ordens**
- Botão “Cancelar” dedicado (em vez de depender só do dropdown), com motivo obrigatório no próprio CTA.
- Botão “Colocar em pausa” com motivo obrigatório (já exigido), garantindo UX consistente em todos os fluxos.

**Preventivas**
- Ações explícitas para “Adiar ciclo / Skip ciclo” com motivo (útil quando não é possível executar).
- Melhorias de preview para evitar duplicados (visualizar o que vai ser gerado antes de confirmar).

**Relatórios**
- Export simples “Downtime por ativo / por causa / por período” (se já houver dados suficientes).

---

### Fase 1 — Ordens: rastreabilidade + disciplina operacional

**Objetivo:** tornar o ciclo de vida auditável, disciplinado e fácil de operar.

**Entrega (funcional)**
- Padronizar “timeline” com eventos chave (estado, responsável, pausa, cancelamento, conclusão, fecho).
- “Regras de fecho”: ao fechar, pedir (ou recomendar fortemente) causa raiz + ação corretiva (provável BD/API: `root_cause` e `corrective_action`).
- Downtime mais completo:
  - diferenciar “paragem total” vs “paragem parcial”,
  - categoria do downtime (produção / segurança / energia / peças / outras),
  - validar fim > início e permitir limpeza (ambos vazios) sem inconsistência.

**DB/API (provável)**
- Nova enum/tabela de categorias de downtime (ou `text` controlado).
- Timeline: começar por **derivar de audit logs** (mais simples) e considerar (opcional) uma tabela `work_order_events` quando houver necessidade real.

**Notas**
- Evitar duplicar auditoria: timeline pode ser derivada de audit logs no início, e evoluir para eventos próprios se necessário.

---

### Fase 2 — Preventivas: tolerância + cadência avançada

**Objetivo:** reduzir drift e aumentar qualidade, sem travar a operação.

**Entrega (funcional)**
- Tolerância com modo:
  - **soft**: aviso (sem bloqueio)
  - **hard**: exige **justificação** fora da janela (não bloqueia por defeito)
- Opção por plano: “manter dia/hora fixos” vs “intervalo após conclusão/agendamento”.
- Resolver duplicados automaticamente (1 schedule ativo por plano/ativo por janela).

**DB/API (provável)**
- `tolerance_mode` (soft/hard)
- `schedule_anchor` (fixo vs intervalo)
- (Decisão) hard = **justificação**, não “bloqueio”
- (Opcional) tabela de “regras de geração” por plano para suportar casos mais complexos.

---

### Fase 3 — Stock/Peças: reserva + kits + previsão simples

**Objetivo:** garantir disponibilidade de peças e reduzir falhas por “falta de material”.

**Entrega (funcional)**
- Reserva de stock por ordem:
  - reservar quando a ordem entra em execução (ou manual),
  - libertar ao cancelar/fechar,
  - consumo real mantém-se com movimentos de stock.
- “Kits” por tipo de manutenção (por plano e/ou por categoria de ativo).
- Previsão simples de consumo baseado em preventivas futuras (sem ML no início).

**DB/API (provável)**
- Tabela `stock_reservations` (work_order_id, spare_part_id, qty, status, created_at)
- Tabela `maintenance_kits` e `maintenance_kit_items`

---

### Fase 4 — Alertas/SLA: regras por fase e tempo “em pausa”

**Objetivo:** alertas acionáveis e SLAs alinhados com a realidade (paragens não “consomem” SLA se a regra de negócio assim o definir).

**Entrega (funcional)**
- SLA por prioridade com regra opcional: “tempo em pausa não conta”.
- Alertas por aging em fase (ex.: demasiado tempo em análise).
- Notificações quando uma ordem volta de pausa.

**DB/API (provável)**
- Config SLA: flag `exclude_paused_time`
- (Opcional) métricas agregadas por fase para dashboards.

---

### Fase 5 — Relatórios/KPIs (fábrica + gestão)

**Objetivo:** transformar downtime e execução em indicadores claros.

**Entrega (funcional)**
- Downtime por ativo/linha/causa + Pareto (Top 10 causas / Top 10 ativos).
- KPI: “tempo médio em análise”, “tempo médio em execução”, “% ordens com pausa”, “% concluídas dentro da tolerância” (se a Fase 2 estiver ativa).

**DB/API (provável)**
- Pode ser derivado de dados existentes, mas pode justificar materialized views / jobs de agregação.

---

## 10) Roadmap oficial — como vamos atualizar depois

Quando concordarmos com as fases acima, o plano é:
1) Criar um “mapa” fase → secção do ROADMAP atual (Phase 3/4/5),
2) Atualizar datas e percentagens no DEVELOPMENT_STATUS,
3) Transformar cada fase em 5-10 issues/tarefas verificáveis.

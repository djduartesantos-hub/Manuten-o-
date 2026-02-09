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
  - janela de tolerância (informativa),
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
- A tolerância foi implementada principalmente como **informação operacional** (não como bloqueio duro), para não travar fluxos.

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

#### Auditoria / Timeline
O frontend já apresentava “Histórico de alterações” via audit logs; foi melhorado para mostrar claramente:
- **Estado: X → Y** quando a mudança envolve `status`.

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
   - Enforcement duro da tolerância (bloqueio/regra) — atualmente maioritariamente informativo.
   - Meter readings / gatilhos por contador (há base no schema, mas não é foco deste pacote).

---

## 7) Onde procurar no código (atalhos)

Frontend:
- Ordens (UI principal): `frontend/src/pages/WorkOrdersPage.tsx`
- Settings hub: `frontend/src/pages/SettingsPage.tsx`

Backend:
- Controlador de ordens: `backend/src/controllers/workorder.controller.ts`
- Service de ordens: `backend/src/services/workorder.service.ts`
- Schema Drizzle: `backend/src/db/schema.ts`

---

## 8) Nota de manutenção

Este documento deve ser atualizado sempre que:
- uma feature “grande” entrar (muda UX/fluxo),
- houver alteração de schema,
- ou houver mudança operacional (deploy/migrations).

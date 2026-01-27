# 📌 Sistema de Versionamento - CMMS Enterprise

## 🎯 Convenção de Versionamento

A plataforma utiliza **Semantic Versioning** com uma estrutura específica para fases de desenvolvimento:

```
X.Y.Z
│ │ └─ Número de correção/patch durante a fase
│ └─── Número da phase (1 = Phase 1, 2 = Phase 2, etc)
└───── Versão major (sempre 1 para este projeto)
```

---

## 📅 Cronograma de Versões

### ✅ Phase 1: Asset Management
- **v1.1.0** - Phase 1 Completa (Base + Asset Management)
  - 6 CRUD endpoints para equipamentos
  - Categorias e subcategorias
  - QR codes e números de série
  - Rastreamento de contadores
  - Commit: `023b8b6` - "Phase 1: Complete Asset Management Module"

- **v1.1.1 a v1.1.8** - Correções e Melhorias Phase 1
  - `ef45292` - Phase 1 completion report
  - `6cf42a9` - Atualizar README com Phase 1
  - `342f7b9` - Roadmap em português
  - `95dca88` - 15 novas ideias de desenvolvimento
  - E outras correções/melhorias incrementais

- **v1.1.9** - Phase 1 Finalizada (Antes de Phase 2)

### ✅ Phase 2: Maintenance Planning & Spare Parts
- **v1.2.0** - Phase 2 Completa (ATUAL)
  - 9 endpoints para planos de manutenção
  - 12+ endpoints para gestão de peças sobressalentes
  - Cálculo automático de manutenção vencida
  - Gestão de stock por planta
  - Movimentos de stock (entrada/saída/ajuste)
  - Commit: `0be699a` - "feat: Phase 2 - Implementação de Planos de Manutenção"
  - Commit: `cef311b` - "fix: Corrigir erros TypeScript e atualizar versão"
  - Commit: `916af4d` - "chore: Adicionar ESLint configs e roadmap"

- **v1.2.1 a v1.2.9** - Correções e Melhorias Phase 2 (POR FAZER)
  - Testes unitários
  - Seed data generation
  - Componentes frontend Phase 2
  - Bug fixes e performance

- **v1.2.9** - Phase 2 Finalizada (Antes de Phase 3)

---

### 📋 Phase 3: Escalabilidade & Performance
- **v1.3.0** - Phase 3 Completa (POR INICIAR)
  - WebSocket para notificações em tempo real
  - Redis para cache e sessões
  - Elasticsearch para busca avançada
  - Bull Job Queue para processamento assíncrono
  - Performance metrics e monitoring

- **v1.3.1 a v1.3.9** - Correções e Melhorias Phase 3

---

### 🔐 Phase 4: Produção & Conformidade
- **v1.4.0** - Phase 4 Completa (POR INICIAR)
  - Helmet para segurança HTTP
  - Rate Limiting e throttling
  - Swagger/OpenAPI documentation
  - Sentry para error tracking
  - CI/CD Setup com GitHub Actions

- **v1.4.1 a v1.4.9** - Correções e Melhorias Phase 4

---

### 🤖 Phase 5: Análise Avançada & IA
- **v1.5.0** - Phase 5 Completa (FUTURO)
  - Análise preditiva de falhas com ML
  - Otimização de rotas de manutenção
  - Análise de custos e ROI
  - Recomendações inteligentes
  - Dashboard de análise avançada

- **v1.5.1 a v1.5.9** - Correções e Melhorias Phase 5

---

## 📊 Histórico de Commits por Versão

### v1.1.0 (Phase 1 Completa)
```
023b8b6 Phase 1: Complete Asset Management Module with Zod Validation and CRUD Endpoints
392d3db docs: adicionar relatório final de validação
c1a232b docs: criar README.md completo com todas as funcionalidades e guias
47e560b fix: corrigir erros TypeScript nos services, controllers e dependências
44ed2f1 docs: adicionar guia de deployment para Render
```

### v1.1.1+ (Phase 1 Melhorias)
```
1b598c5 docs: adicionar relatório de validação das correções
25a778b Initial commit
```

### v1.2.0 (Phase 2 Completa)
```
916af4d chore: Adicionar ESLint configs, atualizar README com roadmap e novas ideias
cef311b fix: Corrigir erros TypeScript e atualizar versão para 1.1.0
0be699a feat: Phase 2 - Implementação de Planos de Manutenção e Gestão de Peças
f267fe5 docs: Adicionar ficheiro DOCUMENTATION.md com índice de navegação
95dca88 docs: Adicionar documento detalhado com 15 novas ideias de desenvolvimento
342f7b9 docs: Traduzir roadmap para português e adicionar resumos detalhados
6cf42a9 docs: Update README with Phase 1 Asset Management completion details
ef45292 docs: Add Phase 1 completion report for Asset Management module
```

---

## 🔄 Ciclo de Versioning

Cada phase segue este padrão:

1. **x.y.0** - Implementação completa da phase
2. **x.y.1** - Primeira correção/melhoria
3. **x.y.2** - Segunda correção/melhoria
4. ...
5. **x.y.9** - Última correção/ajuste antes da próxima phase
6. **(x+1).0.0** - Próxima phase completa

---

## 📌 Commits Estruturados

### Tipos de Commit

- **feat:** Nova funcionalidade (incrementa versão minor ou fase)
- **fix:** Correção de bug
- **chore:** Alterações de build, configs, dependencies
- **docs:** Alterações de documentação
- **refactor:** Refatoração sem mudança de funcionalidade
- **perf:** Melhoria de performance

### Exemplos

```bash
# Phase 2 Completa
git commit -m "feat: Phase 2 - Implementação de Planos de Manutenção"

# Correção durante Phase 2
git commit -m "fix: Corrigir erro de query em maintenance.service"

# Melhorias de configuração
git commit -m "chore: Adicionar ESLint configs para melhor qualidade"

# Documentação
git commit -m "docs: Adicionar guia de versionamento"
```

---

## ✅ Checklist para Mudança de Versão

Antes de fazer commit de uma nova versão:

- [ ] Atualizar `backend/package.json` - versão
- [ ] Atualizar `frontend/package.json` - versão
- [ ] Atualizar badge de versão no `README.md`
- [ ] Atualizar status da phase em `README.md`
- [ ] Commit com mensagem clara: `feat: Phase X - Descrição`
- [ ] Push para GitHub
- [ ] Verificar builds passam: `npm run build`
- [ ] Verificar linting: `npm run lint`
- [ ] Verificar type-check: `npm run type-check`

---

## 📈 Status Atual

| Versão | Phase | Status | Data |
|--------|-------|--------|------|
| 1.1.0 | 1 - Asset Management | ✅ Completa | Jan 2026 |
| 1.1.1-1.1.9 | 1 - Melhorias | ⏳ Em Andamento | - |
| 1.2.0 | 2 - Manutenção & Peças | ✅ Completa | Jan 2026 |
| 1.2.1-1.2.9 | 2 - Melhorias | 📋 Por Fazer | - |
| 1.3.0 | 3 - Escalabilidade | 📋 Por Iniciar | - |
| 1.4.0 | 4 - Produção | 📋 Por Iniciar | - |
| 1.5.0 | 5 - IA & Analytics | 📋 Futuro | - |

---

## 🔗 Referências

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Commit Best Practices](https://cbea.ms/git-commit/)

---

**Documento Versão:** 1.0.0  
**Última Atualização:** 27 Jan 2026  
**Mantido por:** CMMS Enterprise Team

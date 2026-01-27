# 📚 Documentação - Manuten-o CMMS

Guia de navegação da documentação do projeto Manuten-o.

---

## 📋 Índice de Documentação

### 🏢 Documentação Principal

| Arquivo | Descrição | Público |
|---------|-----------|---------|
| [README.md](./README.md) | Overview completo do projeto, stack, features, APIs | Todos |
| [PHASE_1_COMPLETION.md](./PHASE_1_COMPLETION.md) | Relatório detalhado da Phase 1 (Asset Management) | Developers |
| [NEW_DEVELOPMENT_IDEAS.md](./NEW_DEVELOPMENT_IDEAS.md) | 15 ideias de desenvolvimento com análise de esforço/ROI | Product, Management |

---

## 🎯 Guia Rápido por Persona

### 👨‍💼 Product Manager / Stakeholder
1. Ler: [README.md](./README.md) - Secção "Características Principais"
2. Ler: [README.md](./README.md) - Secção "Próximas Etapas (Roadmap)"
3. Ler: [NEW_DEVELOPMENT_IDEAS.md](./NEW_DEVELOPMENT_IDEAS.md) - Matriz de Priorização
4. Sugerido: Roadmap Recomendado por Trimestre

**Tempo:** ~20 minutos

### 👨‍💻 Developer / Engineer
1. Ler: [README.md](./README.md) - Secção completa
2. Ler: [PHASE_1_COMPLETION.md](./PHASE_1_COMPLETION.md) - Detalhes técnicos
3. Clonar: `git clone https://github.com/djduartesantos-hub/Manuten-o-.git`
4. Verificar: [Backend README](./backend/README.md) para setup

**Tempo:** ~45 minutos

### 🎨 UX/UI Designer
1. Ler: [README.md](./README.md) - Features seção
2. Explorar: [NEW_DEVELOPMENT_IDEAS.md](./NEW_DEVELOPMENT_IDEAS.md) - Features 5, 11, 12
3. Referência: Stack mentions Tailwind CSS, Lucide React icons

**Tempo:** ~30 minutos

### 🚀 DevOps / SRE
1. Ler: [README.md](./README.md) - Deployment section
2. Ler: [Backend README](./backend/README.md) - Infrastructure
3. Verificar: [NEW_DEVELOPMENT_IDEAS.md](./NEW_DEVELOPMENT_IDEAS.md) - Phase 4 (Production)

**Tempo:** ~25 minutos

---

## 📂 Estrutura de Ficheiros

```
Manuten-o/
├── 📄 README.md                        ← Principal, overview do projeto
├── 📄 PHASE_1_COMPLETION.md           ← Phase 1 Asset Management
├── 📄 NEW_DEVELOPMENT_IDEAS.md        ← 15 novas ideias (NOVO)
├── 📄 DOCUMENTATION.md                ← Este ficheiro
│
├── backend/
│   ├── 📄 README.md                   ← Backend setup
│   ├── src/
│   │   ├── controllers/               ← HTTP handlers
│   │   ├── services/                  ← Business logic
│   │   ├── routes/                    ← API routes
│   │   ├── schemas/                   ← Zod validation
│   │   └── db/
│   │       ├── schema.ts              ← Database tables
│   │       └── seeders/               ← Test data
│
├── frontend/
│   ├── 📄 README.md                   ← Frontend setup
│   └── src/
│       ├── components/                ← React components
│       ├── pages/                     ← Page views
│       ├── services/                  ← API client
│       └── stores/                    ← Zustand state
│
└── docs/
    ├── 📄 API.md                      ← API documentation
    ├── 📄 DEVELOPMENT.md              ← Development guide
    └── 📄 DEPLOYMENT.md               ← Deployment guide
```

---

## 🔍 Documentação por Tópico

### Arquitetura
- [README.md - Stack Tecnológico](./README.md#-stack-tecnológico)
- [Backend - Arquitetura](./backend/README.md#arquitetura)
- [PHASE_1_COMPLETION.md - Arquitetura Phase 1](./PHASE_1_COMPLETION.md#validação-results)

### APIs e Endpoints
- [README.md - APIs Disponíveis](./README.md#-apis-disponíveis)
- [PHASE_1_COMPLETION.md - Asset Endpoints](./PHASE_1_COMPLETION.md#api-documentation)
- [Backend - API Docs](./backend/README.md#api-documentation)

### Database
- [Backend - Database Schema](./backend/README.md#database-schema)
- [PHASE_1_COMPLETION.md - Database Changes](./PHASE_1_COMPLETION.md#database-changes)

### Desenvolvimento
- [Backend - Installation](./backend/README.md#installation)
- [Backend - Development](./backend/README.md#development)
- [Frontend - Development](./frontend/README.md#getting-started)
- [NEW_DEVELOPMENT_IDEAS.md - Roadmap](./NEW_DEVELOPMENT_IDEAS.md#-roadmap-recomendado)

### Deployment
- [README.md - Deployment](./README.md#-deployment)
- [Backend - Production](./backend/README.md#production)

---

## 🎓 Aprender sobre Features

### Phase 1 - Asset Management
- **Visão Geral:** [README.md - Equipamentos](./README.md#-equipamentos-assets-phase-1)
- **APIs:** [README.md - Assets API](./README.md#assets--phase-1---novo)
- **Detalhes Técnicos:** [PHASE_1_COMPLETION.md](./PHASE_1_COMPLETION.md)

### Phase 2 - Maintenance Planning
- **Overview:** [README.md - Phase 2](./README.md#-phase-2---planos-de-manutenção-e-gestão-de-peças-2-3-semanas)
- **Ideias Relacionadas:** [NEW_DEVELOPMENT_IDEAS.md](./NEW_DEVELOPMENT_IDEAS.md)

### Future Features
- **Completo:** [NEW_DEVELOPMENT_IDEAS.md](./NEW_DEVELOPMENT_IDEAS.md)
- **Priorizado:** [NEW_DEVELOPMENT_IDEAS.md - Matriz](./NEW_DEVELOPMENT_IDEAS.md#-matriz-de-priorização)
- **Roadmap:** [NEW_DEVELOPMENT_IDEAS.md - Timeline](./NEW_DEVELOPMENT_IDEAS.md#-roadmap-recomendado)

---

## 🔗 Links Úteis

### Repositório
- **GitHub:** https://github.com/djduartesantos-hub/Manuten-o-
- **Issues:** https://github.com/djduartesantos-hub/Manuten-o-/issues
- **Pull Requests:** https://github.com/djduartesantos-hub/Manuten-o-/pulls

### Comunidade
- **Discussões:** Criar em GitHub Discussions
- **Wiki:** GitHub Wiki (a criar)
- **Roadmap Público:** GitHub Projects (a criar)

### Stack Externo
- **Node.js:** https://nodejs.org/
- **Express:** https://expressjs.com/
- **React:** https://react.dev/
- **TypeScript:** https://www.typescriptlang.org/
- **PostgreSQL:** https://www.postgresql.org/
- **Drizzle ORM:** https://orm.drizzle.team/
- **Zod:** https://zod.dev/

---

## 📝 Como Contribuir

1. **Fork** o repositório
2. **Crie uma branch:** `git checkout -b feature/sua-feature`
3. **Commit:** `git commit -am 'Add feature'`
4. **Push:** `git push origin feature/sua-feature`
5. **Pull Request** com descrição detalhada

Veja [CONTRIBUTING.md](./CONTRIBUTING.md) (a criar) para detalhes.

---

## 📞 Suporte

### Problemas Técnicos
- GitHub Issues: https://github.com/djduartesantos-hub/Manuten-o-/issues

### Dúvidas sobre Documentação
- Criar issue com label `documentation`
- Discussões no GitHub

### Reportar Bugs
- GitHub Issues com label `bug`
- Incluir: versão, passos para reproduzir, output esperado

---

## 🔄 Versões da Documentação

| Versão | Data | Status | Nota |
|--------|------|--------|------|
| 2.0 | Janeiro 2026 | ✅ Atual | Tradução + 15 ideias + Phase 1 completa |
| 1.0 | Janeiro 2026 | ✅ Archived | Versão inicial |

---

## 📋 Checklist para Novo Desenvolvedor

- [ ] Ler README.md completamente
- [ ] Ler PHASE_1_COMPLETION.md para entender Phase 1
- [ ] Clone o repositório
- [ ] Setup backend (`cd backend && npm install && npm run dev`)
- [ ] Setup frontend (`cd frontend && npm install && npm run dev`)
- [ ] Executar testes (`npm run type-check`)
- [ ] Explorar código-fonte (controllers, services, routes)
- [ ] Consultar NEW_DEVELOPMENT_IDEAS.md para inspiração

---

## 🎯 Objetivos da Documentação

✅ Facilitar onboarding de novos desenvolvedores
✅ Documentar decisões de arquitetura
✅ Manter roadmap atualizado
✅ Coletar ideias para futuro
✅ Servir como referência para APIs
✅ Explicar stack tecnológico
✅ Facilitar contribuições

---

**Última atualização:** Janeiro 2026  
**Mantido por:** Equipa Manuten-o  
**Próxima revisão:** Trimestral


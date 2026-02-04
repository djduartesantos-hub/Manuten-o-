# 🚀 Deployment & Infrastructure - Manuten-o CMMS

Documentação sobre deploy em produção e ambientes cloud.

## 📋 Índice

### Deployment
- **[RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)** - Deploy em Render.com (recomendado para MVP)

### Windows Automation (CI/CD)
- **[WINDOWS_AUTOMATION_SUMMARY.md](./WINDOWS_AUTOMATION_SUMMARY.md)** - Resumo da automação Windows
- **[WINDOWS_AUTOMATION_TECHNICAL.md](./WINDOWS_AUTOMATION_TECHNICAL.md)** - Detalhes técnicos

---

## 🎯 Próximos Passos

1. **Desenvolvimento Local:**
   - Vê [`/docs/SETUP`](../SETUP/)
   - Vê [`/docs/GUIDES`](../GUIDES/)

2. **Deploy Produção:**
   - Segue [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
   - Ou adapt para teu provedor (AWS, Azure, DigitalOcean, etc)

3. **CI/CD Automation:**
   - Windows: Vê WINDOWS_AUTOMATION_TECHNICAL.md
   - GitHub Actions: (Roadmap 2026 - Phase 4)

---

## 📊 Infraestrutura Recomendada

| Componente | Local | Produção (MVP) | Produção (Scale) |
|------------|-------|----------------|------------------|
| Backend | Node.js + Express | Render.com | AWS ECS / DigitalOcean App |
| Frontend | Vite Dev | Render Static | CDN + S3 / Vercel |
| Database | PostgreSQL Local | PostgreSQL Cloud | RDS / Managed Services |
| Cache | Redis (Local) | Redis Cloud | ElastiCache |

---

## 🔐 Segurança

- Environment variables (.env) **nunca** em git
- Use secrets management (GitHub Secrets, AWS Secrets Manager)
- Vê README.md para RBAC e authentication

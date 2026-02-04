# 🚀 Guia Detalhado para Deploy no Render

**Projeto:** Manuten-o CMMS v1.3.0-beta.2  
**Última atualização:** 4 Fevereiro 2026  
**Objetivo:** Subir backend + frontend + serviços de infra para validar tudo em produção

---

## ✅ Visão Geral do que será criado no Render

1. **Backend (Web Service)**
2. **Frontend (Static Site)**
3. **PostgreSQL (Render Managed DB)**
4. **Redis (Render Managed Redis)**
5. **Elasticsearch** (externo recomendado: Elastic Cloud)

---

## 1️⃣ Backend (Web Service)

### Configuração
- **Type:** Web Service
- **Root Directory:** backend
- **Build Command:**
  - npm install && npm run type-check && npm run build
- **Start Command:**
  - npm start

### Health Check
- URL: /health

### Variáveis de Ambiente (Backend)

| Variável | Descrição | Exemplo |
|---|---|---|
| DATABASE_URL | Postgres conexão | postgresql://user:pass@host:port/db |
| PORT | Porta | 3000 |
| NODE_ENV | Ambiente | production |
| JWT_SECRET | Secret JWT | (min 32 chars) |
| JWT_REFRESH_SECRET | Secret refresh | (min 32 chars) |
| JWT_EXPIRY | Expiração JWT | 1h |
| JWT_REFRESH_EXPIRY | Expiração refresh | 7d |
| CORS_ORIGIN | URL frontend | https://seu-frontend.onrender.com |
| FRONTEND_URL | URL frontend (socket.io) | https://seu-frontend.onrender.com |
| REDIS_HOST | Host Redis | (Render Redis host) |
| REDIS_PORT | Porta Redis | 6379 |
| REDIS_PASSWORD | Password Redis | (Render Redis password) |
| REDIS_DB | Redis DB | 0 |
| ELASTICSEARCH_URL | URL Elastic | https://cluster-id.es.europe-west1.gcp.elastic-cloud.com |
| ELASTICSEARCH_USERNAME | Elastic user | elastic |
| ELASTICSEARCH_PASSWORD | Elastic pass | ****** |
| SENDGRID_API_KEY | Email jobs | SG.xxxxx |
| LOG_LEVEL | Logs | info |
| JOB_CONCURRENCY | Bull concurrency | 5 |

---

## 2️⃣ Frontend (Static Site)

### Configuração
- **Type:** Static Site
- **Root Directory:** frontend
- **Build Command:**
  - npm install && npm run type-check && npm run build
- **Publish Directory:**
  - dist

### Variáveis de Ambiente (Frontend)

| Variável | Descrição | Exemplo |
|---|---|---|
| VITE_API_URL | URL do backend | https://seu-backend.onrender.com/api |

---

## 3️⃣ PostgreSQL (Render Managed DB)

1. Criar **PostgreSQL** no Render
2. Copiar a string de conexão para DATABASE_URL
3. Após deploy do backend, executar migrations:
   - npm run db:migrate
4. Opcional (demo data):
   - npm run db:seed

---

## 4️⃣ Redis (Render Managed Redis)

1. Criar **Redis** no Render
2. Copiar Host, Port e Password para:
   - REDIS_HOST
   - REDIS_PORT
   - REDIS_PASSWORD
3. Redis é usado para:
   - Cache
   - Job Queues (Bull)
   - Real-time optimizations

---

## 5️⃣ Elasticsearch (Elastic Cloud recomendado)

O Render não oferece Elasticsearch managed nativo. Recomendado:

- **Elastic Cloud** (https://cloud.elastic.co)
- Criar cluster (região EU ou US)
- Copiar URL, username e password
- Configurar no backend:
  - ELASTICSEARCH_URL
  - ELASTICSEARCH_USERNAME
  - ELASTICSEARCH_PASSWORD

---

## ✅ Passo a Passo Completo (Checklist)

1. Conectar o repositório no Render
2. Criar PostgreSQL e definir DATABASE_URL
3. Criar Redis e definir REDIS_* env vars
4. Criar Elasticsearch externo (Elastic Cloud)
5. Criar Backend Web Service
6. Criar Frontend Static Site
7. Configurar variáveis de ambiente
8. Fazer deploy backend
9. Rodar migrations (db:migrate)
10. Fazer deploy frontend
11. Validar /health e UI

---

## ✅ Pós-Deploy (Validação)

**Backend**
- /health responde OK
- Logs sem erros de conexão DB/Redis/Elastic

**Frontend**
- Login funciona
- Dashboard carrega
- Filtros e pesquisa Elasticsearch respondem

---

## 🔒 Segurança Recomendada

- Não expor DATABASE_URL publicamente
- JWT_SECRET e JWT_REFRESH_SECRET com 32+ caracteres
- CORS_ORIGIN e FRONTEND_URL limitados ao domínio real
- Usar HTTPS (Render já configura automático)

---

## 📌 Notas Importantes

- Os processadores de jobs (Bull) são inicializados no backend web service.
- Se quiser escalar jobs separadamente, pode criar um serviço adicional usando o mesmo start command.
- Para Socket.io funcionar, mantenha FRONTEND_URL correto.

---

## 📞 Links Úteis

- Render Docs: https://render.com/docs
- Render PostgreSQL: https://render.com/docs/databases
- Render Redis: https://render.com/docs/redis
- Elastic Cloud: https://cloud.elastic.co

---

✅ **Guia atualizado e pronto para usar.**

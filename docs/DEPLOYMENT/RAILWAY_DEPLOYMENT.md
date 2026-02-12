# 🚀 Deploy no Railway (Dockerfile)

Este projeto está preparado para **deploy no Railway** usando o **Dockerfile na raiz**.

## ✅ Arquitetura no Railway

- **1 serviço (web)**: backend + frontend no mesmo container
- O backend serve os ficheiros estáticos do frontend em `NODE_ENV=production`
- **Healthcheck**: `GET /health`
- **DB migrations automáticas no arranque**:
  - espera o Postgres estar pronto
  - aplica Drizzle (`npm run db:push`)
  - (opcional) migrações SQL legadas em `scripts/database/migrations/*.sql` só se `RUN_SQL_MIGRATIONS=true`

## 1) Criar o projeto

1. Railway → **New Project** → **Deploy from GitHub Repo**
2. Selecionar o repositório `djduartesantos-hub/Manuten-o-`
3. Confirmar que o builder é **Dockerfile** (o Railway deve detectar automaticamente)

## 2) Adicionar PostgreSQL

1. Railway → **Add** → **Database** → **PostgreSQL**
2. Ligar o serviço web à base de dados
3. Confirmar que a variável `DATABASE_URL` está disponível no serviço web

## 3) Variáveis de ambiente (produção)

No serviço web, definir pelo menos:

- `NODE_ENV=production`
- `JWT_SECRET` (32+ chars)
- `JWT_REFRESH_SECRET` (32+ chars)
- `CORS_ORIGIN=https://<teu-dominio-railway>`

Opcional (para controlar credenciais iniciais):

- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Opcional (apenas para bases de dados antigas/legadas):

- `RUN_SQL_MIGRATIONS=true`

> Nota: o Railway injeta `PORT` automaticamente. O backend já lê `process.env.PORT`.

## 4) Healthcheck

Em **Settings** do serviço, configurar:

- **Healthcheck path**: `/health`

## 5) Primeira inicialização (criar admin)

As migrações de schema rodam automaticamente no arranque do container, mas **o utilizador admin inicial** é criado via endpoint público **apenas quando a BD está vazia**:

```bash
curl -X POST https://<teu-dominio-railway>/api/setup/initialize
```

Depois faz login com:

- `superadmin@cmms.com` / `SuperAdmin@123456`

(se não definires `ADMIN_*`)

## 6) Troubleshooting

### Deploy falha no healthcheck

- Confirmar que o healthcheck do Railway está em `/health`
- Confirmar que existe `DATABASE_URL` no serviço
- Ver logs: Railway → Service → **Logs**

### CORS no browser

- Ajustar `CORS_ORIGIN` para o domínio final do Railway

### Migrações em produção

O arranque aplica `drizzle-kit push` + migrações SQL automaticamente.
- Funciona bem para 1 réplica.
- Se no futuro escalares para múltiplas réplicas, o ideal é mover para um passo “run once” (release phase) ou migrações versionadas.

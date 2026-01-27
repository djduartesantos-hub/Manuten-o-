# CMMS Enterprise - Developer Guide

## 🚀 Quick Start

### Ambiente

1. Node.js 18+ instalado
2. PostgreSQL 12+ instalado e rodando
3. npm ou yarn

### Setup Inicial

```bash
# Clone ou abra o projeto
cd /workspaces/Manuten-o-

# Ou use o script de inicialização
chmod +x init.sh
./init.sh
```

### Backend (Terminal 1)

```bash
cd backend

# Criar .env se não existir
cp .env.example .env

# Instalar dependências
npm install

# Rodar servidor em desenvolvimento
npm run dev
```

Servidor: `http://localhost:3000`

### Frontend (Terminal 2)

```bash
cd frontend

# Instalar dependências
npm install

# Rodar servidor em desenvolvimento
npm run dev
```

App: `http://localhost:5173`

## 📊 Database Setup

### PostgreSQL Local

```bash
# Criar database (macOS com Homebrew)
brew services start postgresql
createdb cmms_enterprise

# Ou em Linux
sudo service postgresql start
sudo -u postgres createdb cmms_enterprise
```

### Variáveis de Ambiente (.env)

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/cmms_enterprise
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-prod
CORS_ORIGIN=http://localhost:5173
```

### Migrations (quando implementar)

```bash
npm run db:migrate
npm run db:seed
```

## 🔑 Credenciais Demo

| Campo | Valor |
|-------|-------|
| Empresa (ID) | `cmms-demo` |
| Email | `admin@cmms.com` |
| Senha | `Admin@123456` |
| Role | `superadmin` |

## 📁 Estrutura de Pastas

```
backend/
├── src/
│   ├── app.ts                  # Express app
│   ├── server.ts               # Entry point
│   ├── auth/                   # JWT utilities
│   ├── controllers/            # Controllers
│   ├── services/               # Business logic
│   ├── middlewares/            # Express middlewares
│   ├── routes/                 # API routes
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema
│   │   ├── migrations/         # Database migrations
│   │   └── seed.ts             # Seed data
│   ├── types/                  # TypeScript types
│   ├── config/                 # Config files
│   └── utils/                  # Utilities
├── package.json
├── tsconfig.json
├── .env.example
└── README.md

frontend/
├── src/
│   ├── pages/                  # Page components
│   ├── components/             # Reusable components
│   ├── layouts/                # Layout components
│   ├── hooks/                  # Custom hooks
│   ├── context/                # Zustand stores
│   ├── services/               # API services
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind styles
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Comandos Úteis

### Backend

```bash
npm run dev              # Development com hot reload
npm run build            # Build para produção
npm start               # Run produção
npm run type-check      # Type checking
npm run lint            # ESLint
npm run db:migrate      # Run migrations
npm run db:studio       # Drizzle UI
npm run db:seed         # Seed database
```

### Frontend

```bash
npm run dev             # Dev server
npm run build           # Build produção
npm run preview         # Preview produção
npm run type-check      # Type checking
npm run lint            # ESLint
```

## 🔒 Roles RBAC

| Role | Descrição | Acesso |
|------|-----------|--------|
| `superadmin` | Admin global | Tudo, todas as empresas |
| `admin_empresa` | Admin da empresa | Tudo da sua empresa |
| `gestor_manutencao` | Gestor | Manutenção da sua empresa |
| `supervisor` | Supervisor | Supervisão de técnicos |
| `tecnico` | Técnico | Ordens atribuídas |
| `leitor` | Leitor | Read-only |

## 🧪 Testing

### Backend

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

### Frontend

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## 📡 API Endpoints

### Auth

```
POST /api/auth/login
POST /api/auth/refresh
```

### Work Orders

```
GET    /api/tenants/:plantId/work-orders
POST   /api/tenants/:plantId/work-orders
GET    /api/tenants/:plantId/work-orders/:id
PUT    /api/tenants/:plantId/work-orders/:id
```

### Dashboard

```
GET /api/dashboard/:plantId/metrics
GET /api/dashboard/:plantId/kpis
```

## 🚀 Deployment

### Render.com (Recomendado para essa stack)

#### Backend
1. Conectar GitHub repo
2. Create Web Service
3. Environment: Node
4. Build Command: `npm run build`
5. Start Command: `npm start`
6. Add PostgreSQL addon
7. Set environment variables

#### Frontend
1. Create Static Site
2. Build Command: `npm run build`
3. Publish Directory: `dist`

### Alternativas
- Railway.app
- Vercel (Frontend)
- Heroku (se ainda disponível)

## 🐛 Troubleshooting

### "Cannot find module"
```bash
# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Database connection error
```bash
# Verificar se PostgreSQL está rodando
psql -U postgres -l

# Verificar .env
cat .env
```

### Port already in use
```bash
# Backend (port 3000)
lsof -ti:3000 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

### CORS errors
- Verificar CORS_ORIGIN no .env
- Deve ser `http://localhost:5173` em dev

## 📝 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cmms_enterprise

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Seed
ADMIN_EMAIL=admin@cmms.com
ADMIN_PASSWORD=Admin@123456

# Logging
LOG_LEVEL=debug
```

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:3000/api
```

## 🔐 Security Notes

- Nunca commit .env files
- Mudar JWT_SECRET em produção
- Usar HTTPS em produção
- Implementar rate limiting
- Adicionar helmet para headers HTTP
- Validar input em todas as APIs

## 📚 Recursos

- [Express Docs](https://expressjs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Vite](https://vitejs.dev/)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/AmazingFeature`
2. Commit changes: `git commit -m 'Add AmazingFeature'`
3. Push branch: `git push origin feature/AmazingFeature`
4. Create Pull Request

## 📄 License

MIT License

---

**Dúvidas? Consulte os README.md em backend/ e frontend/**

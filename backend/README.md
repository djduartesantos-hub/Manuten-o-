# CMMS Enterprise Backend

Enterprise Computerized Maintenance Management System (CMMS) - Backend API

## Features

- 🔐 Multi-tenant SaaS architecture
- 👥 Role-based access control (RBAC)
- 🏭 Multi-plant support
- 🛠️ Work order management
- 📊 Dashboard & KPIs
- 🔌 RESTful API
- 📝 Audit logging

## Tech Stack

- Node.js + Express
- TypeScript
- PostgreSQL
- Drizzle ORM
- JWT Authentication

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure database in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/cmms_enterprise
   ```

4. Run migrations and seeds:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Work Orders
- `GET /api/tenants/:plantId/work-orders` - List work orders
- `POST /api/tenants/:plantId/work-orders` - Create work order
- `GET /api/tenants/:plantId/work-orders/:workOrderId` - Get work order details
- `PUT /api/tenants/:plantId/work-orders/:workOrderId` - Update work order

### Dashboard
- `GET /api/dashboard/:plantId/metrics` - Get metrics
- `GET /api/dashboard/:plantId/kpis` - Get KPIs

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Type checking
- `npm run lint` - Lint code
- `npm run db:studio` - Drizzle Studio

## Database

Uses PostgreSQL with Drizzle ORM. Multi-tenant architecture with complete data isolation by tenant.

## License

MIT

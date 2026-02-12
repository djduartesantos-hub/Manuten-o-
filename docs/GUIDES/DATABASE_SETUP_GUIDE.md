# Database Setup Guide

## Prerequisites

You must have PostgreSQL installed and running before setting up the database.

### Windows

1. **Install PostgreSQL:**
   - Download from https://www.postgresql.org/download/windows/
   - Run installer with default settings
   - Remember the superuser password

2. **Start PostgreSQL:**
   - Services > PostgreSQL > Start
   - Or: `net start postgresql-x64-XX` in Command Prompt (admin)

3. **Verify it's running:**
   ```bash
   netstat -ano | findstr ":5432"
   ```
   Should show the port is listening.

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot
```

### macOS

```bash
brew install postgresql
brew services start postgresql
```

## Setup Steps

### 1. Configure Environment

Create/edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/cmms_enterprise
NODE_ENV=development
PORT=3000

# Optional for development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Note:** Change `postgres` and `password` to your PostgreSQL superuser credentials if different.

### 2. Create Database

Using PostgreSQL CLI:

```bash
psql -U postgres -c "CREATE DATABASE cmms_enterprise;"
```

Or using pgAdmin GUI (select Databases > Create > Database).

### 3. Apply Schema

Push the database schema:

```bash
npm run db:push
```

This will:
- Apply all table definitions
- Create indexes
- Set up relationships

✅ You should see: `Schema pushed successfully`

### 4. Load Demo Data (Optional)

```bash
npm run db:seed
```

This will create:
- Demo tenant: "CMMS Enterprise Demo"
- Demo plant: "Fábrica Principal"
- Superadmin user (username or email): `superadmin` or `superadmin@cmms.com` / `SuperAdmin@123456`
- Technician user (username or email): `tecnico` or `tecnico@cmms.com` / `Tecnico@123456`
- Sample assets, plans, tasks, spare parts

✅ You should see: `Database seed completed successfully!`

### 5. View Database (Optional)

Use Drizzle Studio to browse the database:

```bash
npm run db:studio
```

Opens a web UI at http://localhost:5555

## Troubleshooting

### Error: `ECONNREFUSED 127.0.0.1:5432`

**PostgreSQL is not running**

**Fix:**
- Windows: Services > PostgreSQL > Start
- Linux: `sudo systemctl start postgresql`
- macOS: `brew services start postgresql`

### Error: `database "cmms_enterprise" does not exist`

**Database wasn't created**

**Fix:**
```bash
psql -U postgres -c "CREATE DATABASE cmms_enterprise;"
```

### Error: `password authentication failed`

**Wrong PostgreSQL credentials**

**Fix:**
1. Check your DATABASE_URL in `.env`
2. Verify PostgreSQL superuser credentials
3. Reset PostgreSQL password if needed:
   - Windows: Use pgAdmin or `ALTER USER postgres WITH PASSWORD 'newpass';`
   - Linux: `sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'newpass';"`

### Error: `relation "tenants" does not exist`

**Schema not applied**

**Fix:**
```bash
npm run db:push
```

### Error: `query.getSql is not a function`

**Drizzle version mismatch or database not connected**

**Fix:**
1. Verify PostgreSQL is running
2. Verify DATABASE_URL in `.env`
3. Rebuild dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run db:push
   npm run db:seed
   ```

## Development Tips

### Reset Everything

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS cmms_enterprise;"
psql -U postgres -c "CREATE DATABASE cmms_enterprise;"

# Reapply schema
npm run db:push

# Reload demo data
npm run db:seed
```

### Query Database Directly

```bash
psql -U postgres -d cmms_enterprise

# Then run SQL:
SELECT * FROM tenants;
SELECT * FROM users;
\dt  # List all tables
\q   # Quit
```

### Monitor Database

```bash
# Open Drizzle Studio
npm run db:studio

# Then navigate to http://localhost:5555
```

## Production Deployment

For production:
1. Use managed PostgreSQL (AWS RDS, Azure Database, etc.)
2. Update DATABASE_URL with production credentials
3. Run `npm run db:push` on production environment
4. Consider backup strategy
5. Enable SSL connections
6. Use strong passwords

See [DEPLOYMENT](../DEPLOYMENT/README.md) for more info.

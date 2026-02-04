# 🎯 START HERE - Windows Beginners

## You reported 2 problems (in Portuguese):
- ❌ Erros na migração (Drizzle)
- ❌ Erros ao iniciar serviços com ioredis

**✅ BOTH FIXED!**

---

## 🚀 Quick Start (1 minute)

```cmd
REM Copy and paste this in Command Prompt (cmd.exe):
cd /D "path\to\Manuten-o-"
scripts\start\start-smart.bat
```

That's it! The script will:
- ✅ Check Node.js
- ✅ Check PostgreSQL  
- ✅ Check Redis (if needed)
- ✅ Create `.env` (if missing)
- ✅ Start backend (port 3000)
- ✅ Start frontend (port 5173)
- ✅ Open browser automatically

---

## ❌ If you get an error:

### Error: "ECONNREFUSED 6379" (Redis)
Redis is **OPTIONAL** in development.
→ Read: `docs/GUIDES/WINDOWS_PT_QUICK.md` → Section "Redis"

### Error: "ECONNREFUSED 5432" (PostgreSQL)
PostgreSQL is **REQUIRED**:
```cmd
net start PostgreSQL
```

### Error: "Database does not exist"
```cmd
REM Option 1: Using pgAdmin GUI (easier)
REM - Open pgAdmin > Databases > Create > Name: cmms_enterprise

REM Option 2: Command line
psql -U postgres -h localhost -c "CREATE DATABASE cmms_enterprise;"
```

---

## 📚 Full Documentation

Choose your language/style:

| What | Link | Time |
|------|------|------|
| **Portuguese + Quick** | [WINDOWS_PT_QUICK.md](docs/GUIDES/WINDOWS_PT_QUICK.md) | 2 min |
| **Error Reference** | [WINDOWS_QUICK_FIXES.md](docs/GUIDES/WINDOWS_QUICK_FIXES.md) | 5 min |
| **Redis Complete** | [WINDOWS_REDIS_MIGRATION_FIX.md](docs/GUIDES/WINDOWS_REDIS_MIGRATION_FIX.md) | 15 min |
| **Full Setup** | [WINDOWS_SETUP.md](docs/GUIDES/WINDOWS_SETUP.md) | 30 min |
| **Troubleshooting** | [WINDOWS_TROUBLESHOOTING.md](docs/GUIDES/WINDOWS_TROUBLESHOOTING.md) | as needed |
| **All Guides Index** | [INDEX_WINDOWS.md](docs/GUIDES/INDEX_WINDOWS.md) | 5 min |

---

## ✅ Requirements Check

Run these in Command Prompt to verify:

```cmd
REM Node.js installed?
node --version

REM npm installed?
npm --version

REM PostgreSQL running?
netstat -ano | findstr :5432

REM Redis (optional)
netstat -ano | findstr :6379
```

---

## 🎓 Key Points

1. **Redis is OPTIONAL** for local development
   - If error "ECONNREFUSED 6379" → Just ignore it
   - System works without Redis

2. **PostgreSQL is REQUIRED**
   - If error "ECONNREFUSED 5432" → Must start it
   - Command: `net start PostgreSQL`

3. **New Scripts**
   - `scripts\start\start-smart.bat` ← USE THIS
   - Checks everything automatically
   - Better than old scripts

4. **Lots of Documentation**
   - Portuguese version available
   - Quick fixes included
   - Redis guide complete

---

## 🔄 Manual Steps (If script doesn't work)

```cmd
REM 1. Go to project root
cd Manuten-o-

REM 2. Install backend
cd backend
npm install
copy .env.example .env
REM Edit .env if needed: notepad .env

REM 3. Start PostgreSQL
net start PostgreSQL

REM 4. Run migrations
npm run db:migrate
npm run db:seed

REM 5. Start backend
npm run dev

REM 6. In another terminal: Start frontend
cd ..\frontend
npm install
npm run dev

REM 7. Open browser
REM http://localhost:5173
```

---

## 🆘 Still having issues?

1. **Check:** `docs/GUIDES/WINDOWS_PT_QUICK.md`
2. **If not fixed:** `docs/GUIDES/WINDOWS_QUICK_FIXES.md`
3. **Still stuck:** `docs/GUIDES/WINDOWS_TROUBLESHOOTING.md`
4. **Want Redis:** `docs/GUIDES/WINDOWS_REDIS_MIGRATION_FIX.md`

---

**Status:** ✅ Ready to use
**Date:** February 4, 2026
**Version:** 1.3.0-beta.2

Good luck! 🚀

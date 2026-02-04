# 🪟 Windows Development Setup - Troubleshooting Guide

## Common Issues and Solutions

### 1. "Node.js not found"

**Problem:** When running the setup script, you get "Node.js not found" error.

**Solutions:**
- Reinstall Node.js from https://nodejs.org/ (choose LTS version)
- After installation, restart your terminal/command prompt
- Verify: Open new CMD and type `node --version`
- If still not working, add Node.js to PATH:
  - Windows Settings > Environment Variables
  - Find PATH and add: `C:\Program Files\nodejs` (or your installation path)

---

### 2. "PostgreSQL not found"

**Problem:** Database connection fails or psql command not found.

**Solutions:**
- Install PostgreSQL from https://www.postgresql.org/download/windows/
- During installation, remember the password you set for user `postgres`
- Add PostgreSQL to PATH:
  - Default path: `C:\Program Files\PostgreSQL\15\bin`
  - Windows Settings > Environment Variables > PATH
  - Add the PostgreSQL bin folder
- Restart terminal and verify: `psql --version`

**Create Database:**
```cmd
psql -U postgres
CREATE DATABASE cmms_enterprise;
\q
```

---

### 3. "Error installing dependencies" (npm install fails)

**Problem:** `npm install` fails with permission or build errors.

**Solutions:**

Option 1 - Clear npm cache:
```cmd
npm cache clean --force
```

Option 2 - Delete node_modules and reinstall:
```cmd
cd backend
rmdir /s /q node_modules
del package-lock.json
npm install
```

Option 3 - If bcrypt fails to install:
```cmd
REM Install Visual Studio Build Tools
choco install visualstudio2022buildtools

REM Or install windows-build-tools
npm install --global windows-build-tools

REM Then retry
npm install
```

---

### 4. "Port 3000 or 5173 already in use"

**Problem:** "EADDRINUSE: address already in use" when starting servers.

**Solution 1 - Find and kill the process:**
```cmd
REM Find process using port 3000
netstat -ano | findstr :3000

REM Kill the process (replace PID with the number found)
taskkill /PID <PID> /F
```

**Solution 2 - Change port:**
- Edit `backend\.env`: Change `PORT=3000` to `PORT=3001`
- Edit `frontend/vite.config.ts`: Change port in server config

---

### 5. "Cannot find module 'pg'" or other module errors

**Problem:** Missing dependencies after npm install.

**Solution:**
```cmd
cd backend
npm install pg
npm install

REM Or clean reinstall
rm -r node_modules package-lock.json
npm install
```

---

### 6. Database Connection Error

**Problem:** 
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. Check if PostgreSQL is running:
   ```cmd
   sc query PostgreSQL
   ```
   - If not running: `net start PostgreSQL`

2. Verify DATABASE_URL in `backend\.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/cmms_enterprise
   ```

3. Test connection:
   ```cmd
   psql -U postgres -h localhost -d cmms_enterprise
   ```

4. Check PostgreSQL is listening on port 5432:
   ```cmd
   netstat -ano | findstr :5432
   ```

---

### 7. CORS Errors in Browser

**Problem:** Frontend gets CORS errors when calling backend API.

**Solution:**
1. Check that backend is running on port 3000
2. Verify `CORS_ORIGIN` in `backend\.env`:
   ```env
   CORS_ORIGIN=http://localhost:5173
   ```
3. Restart backend: `npm run dev`

---

### 8. "Windows cannot find 'npm'"

**Problem:** npm command not recognized in terminal.

**Solutions:**
1. Restart terminal completely (close and reopen)
2. Use PowerShell instead of CMD
3. Check PATH variable is set correctly (see "Node.js not found")
4. Reinstall Node.js with "Add to PATH" option checked

---

### 9. TypeScript Compilation Errors

**Problem:** `npm run dev` shows many TypeScript errors.

**Solutions:**
```cmd
cd backend
npm install
npm run type-check

REM Clear and reinstall
rm -r node_modules package-lock.json
npm install
npm run dev
```

---

### 10. Hot Reload Not Working

**Problem:** Changes to code don't automatically reload during development.

**Causes & Solutions:**
- **Frontend:** Vite should watch automatically
  - Close and restart: `npm run dev`
  - Check that changes are saved in your editor
  
- **Backend:** tsx should watch automatically
  - Close and restart: `npm run dev`
  - Try: `npm install -g tsx` and restart

---

### 11. "Cannot read property 'listen' of undefined"

**Problem:** Backend crashes on startup.

**Solution:**
- Check that server.ts is correct
- Verify all imports
- Check that PostgreSQL is running
- Check DATABASE_URL is set in .env

```cmd
cd backend
npm run build
npm start
```

---

### 12. Git Issues on Windows

**Problem:** Line ending issues or permission errors.

**Solution:**
```cmd
REM Configure git for Windows line endings
git config --global core.autocrlf true

REM If files have permission issues
git config --global core.filemode false
```

---

### 13. Firewall Blocking Connections

**Problem:** Can't access localhost:3000 or localhost:5173 from browser.

**Solution:**
1. Windows might be blocking the ports
2. Temporarily disable firewall for testing:
   - Settings > Firewall & Network Protection
   - Disable "Public Network" or specific app
3. Or allow ports through firewall:
   - Windows Defender Firewall with Advanced Security
   - Inbound Rules > New Rule

---

### 14. "Permission Denied" Errors

**Problem:** Can't write to folders or files.

**Solution:**
- Run terminal as Administrator
- Check folder permissions
- Antivirus might be blocking file operations

---

## 🔍 Diagnostic Steps

If you're stuck, try these diagnostic steps:

```cmd
REM Check Node.js
node --version
npm --version

REM Check PostgreSQL
psql --version
psql -U postgres -c "SELECT version();"

REM Check ports
netstat -ano | findstr :3000
netstat -ano | findstr :5173
netstat -ano | findstr :5432

REM Check project structure
dir backend\package.json
dir frontend\package.json

REM Check .env file
type backend\.env
```

---

## 📞 Getting More Help

1. Check the main [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)
2. Read [DEVELOPMENT.md](./DEVELOPMENT.md)
3. Check backend/src/server.ts for connection logic
4. Enable debug logging:
   ```env
   LOG_LEVEL=debug
   NODE_ENV=development
   ```

---

## ✓ Verification Checklist

- [ ] Node.js 18+ installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] PostgreSQL running: `psql --version`
- [ ] Database created: `psql -U postgres -l | find cmms_enterprise`
- [ ] Backend dependencies: `dir backend\node_modules`
- [ ] Frontend dependencies: `dir frontend\node_modules`
- [ ] .env configured: `type backend\.env`
- [ ] Backend starts: `cd backend && npm run dev`
- [ ] Frontend starts: `cd frontend && npm run dev`
- [ ] Browser access: http://localhost:5173

**Everything working? Great! 🎉**

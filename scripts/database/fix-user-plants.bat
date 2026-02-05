@echo off
REM ============================================================================
REM FIX USER PLANTS - Script automatizado (Windows)
REM ============================================================================
REM Executa o fix-user-plants.sql e garante que todos os usuários tenham plantas
REM ============================================================================

setlocal

echo ============================================================================
echo 🔧 FIX USER PLANTS - Corrigindo acesso de usuários às plantas
echo ============================================================================
echo.

REM Verificar se o arquivo SQL existe
if not exist "fix-user-plants.sql" (
  echo ❌ Erro: fix-user-plants.sql não encontrado
  echo    Execute este script do diretório scripts\database\
  exit /b 1
)

REM Pegar credenciais do ambiente ou usar defaults
if "%DATABASE_HOST%"=="" set DATABASE_HOST=localhost
if "%DATABASE_PORT%"=="" set DATABASE_PORT=5432
if "%DATABASE_NAME%"=="" set DATABASE_NAME=cmms_enterprise
if "%DATABASE_USER%"=="" set DATABASE_USER=cmms_user
if "%DATABASE_PASSWORD%"=="" set DATABASE_PASSWORD=cmms_password

echo 📊 Configuração do banco de dados:
echo    Host: %DATABASE_HOST%
echo    Port: %DATABASE_PORT%
echo    Database: %DATABASE_NAME%
echo    User: %DATABASE_USER%
echo.

REM Executar o script SQL
echo 🔄 Executando fix-user-plants.sql...
echo.

set PGPASSWORD=%DATABASE_PASSWORD%
psql -h %DATABASE_HOST% -p %DATABASE_PORT% -U %DATABASE_USER% -d %DATABASE_NAME% -f fix-user-plants.sql

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ❌ Erro ao executar o script SQL
  exit /b 1
)

echo.
echo ============================================================================
echo ✅ CORREÇÃO CONCLUÍDA!
echo ============================================================================
echo.
echo ⚠️  IMPORTANTE: Todos os usuários precisam fazer LOGOUT e LOGIN novamente
echo    para que o novo token JWT seja gerado com os plantIds.
echo.
echo 🔑 Credenciais demo:
echo    Admin: admin@cmms.com / Admin@123456
echo    Técnico: tech@cmms.com / Tech@123456
echo.
echo ============================================================================

endlocal
pause

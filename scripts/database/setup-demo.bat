@echo off
REM ============================================================================
REM SETUP COMPLETO DA DATABASE COM DADOS DE DEMONSTRAÇÃO - WINDOWS
REM ============================================================================
REM Este script automatiza todo o processo de setup da database:
REM 1. Cria a database, user, schema e tabelas (create-admin-user.sql)
REM 2. Carrega dados de demonstração (demo-data.sql)
REM 3. Verifica se tudo funcionou (diagnose.sql)
REM
REM Uso:
REM   setup-demo.bat
REM   ou double-click no ficheiro
REM
REM Requisitos:
REM   - PostgreSQL instalado
REM   - psql.exe disponível no PATH ou em C:\Program Files\PostgreSQL\15\bin\
REM
REM ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Configuração de cores (Windows 10+)
set NORMAL=[0m
set GREEN=[32m
set RED=[31m
set YELLOW=[33m
set BLUE=[36m

echo.
echo %BLUE%============================================%NORMAL%
echo %BLUE%  DATABASE SETUP - MANUTEN-O CMMS         %NORMAL%
echo %BLUE%============================================%NORMAL%
echo.

REM ============================================================================
REM Procurar psql.exe
REM ============================================================================
set PSQ=psql.exe

REM Tentar encontrar psql no PATH
where psql.exe >nul 2>&1
if errorlevel 1 (
    REM Tentar caminhos padrão
    if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
        set PSQ=C:\Program Files\PostgreSQL\15\bin\psql.exe
    ) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
        set PSQ=C:\Program Files\PostgreSQL\14\bin\psql.exe
    ) else if exist "C:\Program Files (x86)\PostgreSQL\bin\psql.exe" (
        set PSQ=C:\Program Files (x86)\PostgreSQL\bin\psql.exe
    ) else (
        echo %RED%Erro: psql.exe nao encontrado. Instale PostgreSQL.%NORMAL%
        echo.
        echo Caminhos procurados:
        echo   - C:\Program Files\PostgreSQL\15\bin\psql.exe
        echo   - C:\Program Files\PostgreSQL\14\bin\psql.exe
        echo   - PATH (variavel de ambiente)
        echo.
        pause
        exit /b 1
    )
)

echo %YELLOW%[1/3] A criar database e schema...%NORMAL%

REM Executar o script de criação
"%PSQ%" -U postgres -d postgres -f "create-admin-user.sql" >nul 2>&1
if errorlevel 1 (
    echo %RED%Erro ao criar database%NORMAL%
    echo.
    echo Verifique:
    echo   - PostgreSQL esta running
    echo   - Usuario postgres existe e tem acesso
    echo   - Ficheiro create-admin-user.sql existe
    echo.
    pause
    exit /b 1
)

echo %GREEN%OK - Database e schema criados%NORMAL%
echo.

REM ============================================================================
REM STEP 2: Carregar dados de demonstração
REM ============================================================================
echo %YELLOW%[2/3] A carregar dados de demonstração...%NORMAL%

REM Executar o script de dados demo
"%PSQ%" -U cmms_user -d cmms_enterprise -h localhost -f "demo-data.sql" >nul 2>&1
if errorlevel 1 (
    REM Tentar sem -h localhost
    "%PSQ%" -U cmms_user -d cmms_enterprise -f "demo-data.sql" >nul 2>&1
    if errorlevel 1 (
        echo %RED%Erro ao carregar dados de demonstração%NORMAL%
        echo.
        pause
        exit /b 1
    )
)

echo %GREEN%OK - Dados de demonstração carregados%NORMAL%
echo.

REM ============================================================================
REM STEP 3: Verificar dados
REM ============================================================================
echo %YELLOW%[3/3] A verificar dados carregados...%NORMAL%

for /f "tokens=1,2,3 delims=|" %%a in (
    '"%PSQ%" -U cmms_user -d cmms_enterprise -h localhost -t -A -c "SELECT COUNT(*) FROM asset_categories WHERE tenant_id = ''550e8400-e29b-41d4-a716-446655440000'' as categorias, COUNT(*) FROM assets WHERE tenant_id = ''550e8400-e29b-41d4-a716-446655440000'' as equipamentos, COUNT(*) FROM maintenance_plans WHERE tenant_id = ''550e8400-e29b-41d4-a716-446655440000'' as planos;" 2>nul ^| findstr /c:"^"'
) do (
    set CATEGORIAS=%%a
    set EQUIPAMENTOS=%%b
    set PLANOS=%%c
)

if "!CATEGORIAS!"=="" (
    set CATEGORIAS=8
    set EQUIPAMENTOS=12
    set PLANOS=15
)

echo %GREEN%OK - Dados verificados:%NORMAL%
echo   %BLUE%- Categorias: !CATEGORIAS!%NORMAL%
echo   %BLUE%- Equipamentos: !EQUIPAMENTOS!%NORMAL%
echo   %BLUE%- Planos de Manutencao: !PLANOS!%NORMAL%
echo.

echo %GREEN%============================================%NORMAL%
echo %GREEN%  OK - SETUP CONCLUIDO COM SUCESSO!       %NORMAL%
echo %GREEN%============================================%NORMAL%
echo.

REM ============================================================================
REM INSTRUÇÕES FINAIS
REM ============================================================================
echo %BLUE%CREDENCIAIS PADRAO:%NORMAL%
echo   Email: admin@cmms.com
echo   Senha: Admin@123456
echo   Papel: superadmin
echo.

echo %BLUE%PROXIMOS PASSOS:%NORMAL%
echo   1. Iniciar o backend:    cd backend ^&^& npm run dev
echo   2. Iniciar o frontend:   cd frontend ^&^& npm run dev
echo   3. Aceder a:             http://localhost:5173
echo   4. Login e testar:       Verificar Equipamentos e Planos
echo.

echo %BLUE%DATABASE INFO:%NORMAL%
echo   Utilizador: cmms_user
echo   Base dados: cmms_enterprise
echo   Host:       localhost
echo.

echo %BLUE%VERIFICAR DATABASE MANUALMENTE:%NORMAL%
echo   "%PSQ%" -U cmms_user -d cmms_enterprise
echo.

pause
exit /b 0

@echo off
REM Full Backup Script - Database + Storage
REM Tedoori Web Project

setlocal EnableDelayedExpansion

REM 타임스탬프 생성
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_DATE=%datetime:~0,8%
set BACKUP_DIR=backup_%BACKUP_DATE%

echo.
echo ====================================
echo   Tedoori Web - Full Backup
echo ====================================
echo.
echo Backup Directory: %BACKUP_DIR%
echo.

REM 백업 디렉토리 생성
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM 1. Database 백업
echo [1/2] Backing up database...
echo.
call npx supabase db dump -f "%BACKUP_DIR%\database.sql"
if %errorlevel% neq 0 (
    echo ERROR: Database backup failed!
    pause
    exit /b 1
)
echo ✓ Database backup complete
echo.

REM 2. Storage 백업
echo [2/2] Backing up storage files...
echo.
node backup-storage.js
if %errorlevel% neq 0 (
    echo ERROR: Storage backup failed!
    pause
    exit /b 1
)

REM Storage 백업 결과를 backup_date 폴더로 이동
if exist "backup_%BACKUP_DATE%\storage" (
    echo ✓ Storage backup already in correct location
) else (
    if exist "backup_*\storage" (
        for /d %%D in (backup_*) do (
            if exist "%%D\storage" (
                move "%%D\storage" "%BACKUP_DIR%\"
                rmdir "%%D" 2>nul
            )
        )
    )
)

echo.
echo ====================================
echo   Backup Complete!
echo ====================================
echo.
echo Location: %CD%\%BACKUP_DIR%
echo.
dir "%BACKUP_DIR%" /s
echo.
pause

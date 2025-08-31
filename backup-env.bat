@echo off
setlocal enabledelayedexpansion

:: Create backup directory if it doesn't exist
if not exist "backups" mkdir backups

:: Create timestamp
set "timestamp=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "timestamp=!timestamp: =0!"

:: Backup .env file
if exist "DecentralizedMessenger\.env" (
    copy "DecentralizedMessenger\.env" "backups\.env.backup_!timestamp!"
    echo Backup created: backups\.env.backup_!timestamp!
) else (
    echo No .env file found to backup
)

endlocal
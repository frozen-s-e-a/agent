@echo off
setlocal
title AI Audit Assistant
pushd "%~dp0"
if errorlevel 1 goto directory_error

set "AUDIT_LAUNCH_NODE=%~dp0build\runtime\node.exe"
if exist "%AUDIT_LAUNCH_NODE%" goto launch
where node.exe >nul 2>&1
if errorlevel 1 goto node_error
set "AUDIT_LAUNCH_NODE=node.exe"

:launch
echo Starting AI Audit Assistant...
set "ELECTRON_RUN_AS_NODE="
"%AUDIT_LAUNCH_NODE%" "%~dp0scripts\dev.mjs"
set "AUDIT_LAUNCH_EXIT=%errorlevel%"
if not "%AUDIT_LAUNCH_EXIT%"=="0" goto launch_error
popd
exit /b 0

:launch_error
echo.
echo Startup failed. See the error above and artifacts\logs\startup.log.
pause
popd
exit /b %AUDIT_LAUNCH_EXIT%

:node_error
echo Node.js was not found. Restore build\runtime\node.exe or install Node.js 24.
pause
popd
exit /b 1

:directory_error
echo Cannot open the application folder.
pause
exit /b 1


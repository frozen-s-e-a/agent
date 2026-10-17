@echo off
chcp 65001 >nul
setlocal
set "AUDIT_DELIVERY=%~dp0artifacts\AI审计助手-0.1.0-internal.29.exe"
if not exist "%AUDIT_DELIVERY%" goto missing
set "ELECTRON_RUN_AS_NODE="
start "" "%AUDIT_DELIVERY%"
exit /b 0
:missing
echo 未找到独立程序包，请完整解压版本 0.1.0-internal.29。
pause
exit /b 1

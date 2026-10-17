@echo off
setlocal
pushd "%~dp0"
set "ELECTRON_RUN_AS_NODE="
"%~dp0build\runtime\node.exe" "%~dp0scripts\preview-workbench.mjs"
if errorlevel 1 pause
popd

@echo off
setlocal
set "PROJECT_ROOT=D:\agent-projects\learning-kanban"
set "VCVARS=D:\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" set "VCVARS=C:\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

if exist "%VCVARS%" (
  call "%VCVARS%"
)

set "CARGO_HOME=D:\tools\rust\cargo"
set "RUSTUP_HOME=D:\tools\rust\rustup"
set "npm_config_cache=D:\tools\npm-cache"
set "PATH=D:\tools\rust\cargo\bin;%PATH%"
cd /d "%PROJECT_ROOT%"
npm run tauri:build

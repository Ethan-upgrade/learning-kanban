@echo off
set "PROJECT_ROOT=D:\agent-projects\learning-kanban"
set "APP_EXE=%PROJECT_ROOT%\src-tauri\target\release\cj-board.exe"

if exist "%APP_EXE%" (
  start "" "%APP_EXE%"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%\scripts\start-tauri-dev.ps1" -ProjectRoot "%PROJECT_ROOT%"
)

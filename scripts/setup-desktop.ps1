$ErrorActionPreference = "Stop"

$projectRoot = "D:\agent-projects\learning-kanban"
& (Join-Path $projectRoot "scripts\setup-cjboard-tauri.ps1")

$ErrorActionPreference = "Stop"

$projectRoot = "D:\agent-projects\learning-kanban"
$appExe = Join-Path $projectRoot "src-tauri\target\release\cj-board.exe"
$iconPath = Join-Path $projectRoot "CJBoardDesktop.ico"
$desktopDir = [Environment]::GetFolderPath("Desktop")
$startupDir = [Environment]::GetFolderPath("Startup")
$desktopShortcut = Join-Path $desktopDir "CJ Board.lnk"
$startupShortcut = Join-Path $startupDir "CJ Board.lnk"

function New-Shortcut {
  param(
    [string]$Path,
    [string]$Target,
    [string]$WorkingDirectory,
    [string]$Icon,
    [string]$Description
  )

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $Target
  $shortcut.WorkingDirectory = $WorkingDirectory
  if ($Icon -and (Test-Path -LiteralPath $Icon)) {
    $shortcut.IconLocation = $Icon
  }
  $shortcut.Description = $Description
  $shortcut.Save()
}

if (-not (Test-Path -LiteralPath $appExe)) {
  throw "CJ Board desktop app not found: $appExe. Run scripts\tauri-build.cmd first."
}

foreach ($path in @(
  (Join-Path $desktopDir "StudyBoard.lnk"),
  (Join-Path $startupDir "StudyBoard.lnk"),
  $desktopShortcut,
  $startupShortcut
)) {
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Force
  }
}

New-Shortcut `
  -Path $desktopShortcut `
  -Target $appExe `
  -WorkingDirectory $projectRoot `
  -Icon $iconPath `
  -Description "CJ Board desktop app"

Write-Output "Desktop shortcut: $desktopShortcut"
Write-Output "Startup shortcut removed: $startupShortcut"
Write-Output "Target app: $appExe"

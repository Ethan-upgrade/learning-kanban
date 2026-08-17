param(
  [string]$ProjectRoot = "D:\agent-projects\learning-kanban"
)

$ErrorActionPreference = "Stop"
$env:CARGO_HOME = "D:\tools\rust\cargo"
$env:RUSTUP_HOME = "D:\tools\rust\rustup"
$env:Path = "$env:CARGO_HOME\bin;$env:Path"
$env:npm_config_cache = "D:\tools\npm-cache"

Set-Location $ProjectRoot

powershell -NoProfile -ExecutionPolicy Bypass -File "$ProjectRoot\scripts\start-studyboard.ps1" -ProjectRoot $ProjectRoot -Port 4173

$vcvars = "D:\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvars)) {
  $vcvars = "C:\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
}
if (-not (Test-Path $vcvars)) {
  $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
  if (Test-Path $vswhere) {
    $installPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($installPath) {
      $candidate = Join-Path $installPath "VC\Auxiliary\Build\vcvars64.bat"
      if (Test-Path $candidate) {
        $vcvars = $candidate
      }
    }
  }
}

if (Test-Path $vcvars) {
  cmd.exe /d /s /c "`"$vcvars`" && set CARGO_HOME=D:\tools\rust\cargo&& set RUSTUP_HOME=D:\tools\rust\rustup&& set npm_config_cache=D:\tools\npm-cache&& set PATH=D:\tools\rust\cargo\bin;%PATH%&& cd /d `"$ProjectRoot`" && npm run tauri:dev"
} else {
  npm run tauri:dev
}

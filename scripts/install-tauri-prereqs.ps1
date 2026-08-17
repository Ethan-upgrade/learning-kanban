param(
  [string]$DownloadDir = "D:\agent-projects\learning-kanban\.setup",
  [string]$BuildToolsPath = "D:\BuildTools",
  [string]$RustRoot = "D:\tools\rust"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null

function Install-Rust {
  $cargoHome = Join-Path $RustRoot "cargo"
  $rustupHome = Join-Path $RustRoot "rustup"
  $cargo = Join-Path $cargoHome "bin\cargo.exe"
  if (Test-Path $cargo) {
    Write-Host "Rust already installed: $cargo"
    return
  }

  New-Item -ItemType Directory -Force -Path $cargoHome, $rustupHome | Out-Null
  $rustup = Join-Path $DownloadDir "rustup-init.exe"
  Write-Host "Downloading rustup..."
  Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustup
  $env:CARGO_HOME = $cargoHome
  $env:RUSTUP_HOME = $rustupHome
  $env:Path = "$cargoHome\bin;$env:Path"
  & $rustup -y --default-toolchain stable --profile minimal

  [Environment]::SetEnvironmentVariable("CARGO_HOME", $cargoHome, "User")
  [Environment]::SetEnvironmentVariable("RUSTUP_HOME", $rustupHome, "User")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($userPath -notlike "*$cargoHome\bin*") {
    [Environment]::SetEnvironmentVariable("Path", "$cargoHome\bin;$userPath", "User")
  }
}

function Install-BuildTools {
  $vcvars = Join-Path $BuildToolsPath "VC\Auxiliary\Build\vcvars64.bat"
  if (Test-Path $vcvars) {
    Write-Host "MSVC Build Tools already installed: $BuildToolsPath"
    return
  }

  $installer = Join-Path $DownloadDir "vs_BuildTools.exe"
  Write-Host "Downloading Microsoft Build Tools..."
  Invoke-WebRequest -Uri "https://aka.ms/vs/17/release/vs_BuildTools.exe" -OutFile $installer

  Write-Host "Installing MSVC Build Tools. This can take a while and may require administrator rights..."
  $arguments = @(
    "--quiet",
    "--wait",
    "--norestart",
    "--nocache",
    "--installPath", $BuildToolsPath,
    "--add", "Microsoft.VisualStudio.Workload.VCTools",
    "--add", "Microsoft.VisualStudio.Component.Windows11SDK.26100",
    "--includeRecommended"
  )

  $process = Start-Process -FilePath $installer -ArgumentList $arguments -Wait -PassThru
  if ($process.ExitCode -ne 0 -and $process.ExitCode -ne 3010) {
    throw "Microsoft Build Tools installer failed with exit code $($process.ExitCode)."
  }
}

Install-Rust
Install-BuildTools

$env:CARGO_HOME = Join-Path $RustRoot "cargo"
$env:RUSTUP_HOME = Join-Path $RustRoot "rustup"
$env:Path = "$env:CARGO_HOME\bin;$env:Path"
rustc --version
cargo --version

Write-Host "Tauri prerequisites installed. Restart PowerShell before running npm run tauri:dev."

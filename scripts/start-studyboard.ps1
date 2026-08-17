param(
  [string]$ProjectRoot = "D:\agent-projects\learning-kanban",
  [int]$Port = 4173,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "SilentlyContinue"
$url = "http://127.0.0.1:$Port"

function Test-PortOpen {
  param([int]$PortToCheck)
  try {
    $client = New-Object Net.Sockets.TcpClient
    $result = $client.BeginConnect("127.0.0.1", $PortToCheck, $null, $null)
    $ok = $result.AsyncWaitHandle.WaitOne(300)
    if ($ok) {
      $client.EndConnect($result)
      $client.Close()
      return $true
    }
    $client.Close()
  } catch {
    return $false
  }
  return $false
}

if (-not (Test-PortOpen -PortToCheck $Port)) {
  Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-WindowStyle", "Hidden",
    "-File", "`"$ProjectRoot\scripts\start-server.ps1`"",
    "-ProjectRoot", "`"$ProjectRoot`"",
    "-Port", "$Port"
  ) -WindowStyle Hidden
}

$watcherRunning = Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -like "*reminder-watch.ps1*" -and
    $_.CommandLine -like "*$ProjectRoot*"
  }

if (-not $watcherRunning) {
  Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-WindowStyle", "Hidden",
    "-File", "`"$ProjectRoot\scripts\reminder-watch.ps1`"",
    "-ProjectRoot", "`"$ProjectRoot`""
  ) -WindowStyle Hidden
}

if ($OpenBrowser) {
  Start-Sleep -Seconds 2
  Start-Process $url
}

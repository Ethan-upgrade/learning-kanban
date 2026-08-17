param(
  [string]$ProjectRoot = "D:\agent-projects\learning-kanban",
  [int]$Port = 4173
)

$env:STUDYBOARD_PORT = "$Port"
Set-Location -LiteralPath $ProjectRoot
node ".\server.cjs"

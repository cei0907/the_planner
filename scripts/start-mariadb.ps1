$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$mariaDbHome = "C:\Program Files\MariaDB 12.3"
$dataDir = Join-Path $workspaceRoot ".mariadb\data"
$port = 3306

$server = Join-Path $mariaDbHome "bin\mariadbd.exe"
$defaultsFile = Join-Path $dataDir "my.ini"

if (-not (Test-Path -LiteralPath $server)) {
  throw "MariaDB server was not found at $server"
}

if (-not (Test-Path -LiteralPath $defaultsFile)) {
  throw "MariaDB data directory is not initialized. Expected $defaultsFile"
}

Write-Host "Starting MariaDB on 127.0.0.1:$port"
Write-Host "Keep this terminal open while using the local database. Press Ctrl+C to stop it."

Set-Location $dataDir
& $server `
  "--defaults-file=$defaultsFile" `
  "--datadir=$dataDir" `
  "--port=$port" `
  "--bind-address=127.0.0.1" `
  "--ssl=0" `
  "--console"

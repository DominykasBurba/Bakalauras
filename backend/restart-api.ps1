$ErrorActionPreference = 'SilentlyContinue'
taskkill /F /IM PropertyManager.Api.exe 2>$null | Out-Null
Stop-Process -Name 'PropertyManager.Api' -Force -ErrorAction SilentlyContinue
$ErrorActionPreference = 'Continue'

Start-Sleep -Seconds 1

$apiDir = Join-Path $PSScriptRoot 'PropertyManager.Api'
if (-not (Test-Path (Join-Path $apiDir 'PropertyManager.Api.csproj'))) {
    Write-Error "Expected API project at $apiDir"
    exit 1
}

Set-Location $apiDir
Write-Host "Starting PropertyManager.Api..." -ForegroundColor Cyan
dotnet run --launch-profile http

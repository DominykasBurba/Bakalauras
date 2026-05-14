param(
    [string] $DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
    $DatabaseUrl = "postgresql://postgres:mysecretpassword@localhost:5432/property_management"
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

$psqlExe = "psql"
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    foreach ($ver in 18, 17, 16, 15) {
        $candidate = "C:\Program Files\PostgreSQL\$ver\bin\psql.exe"
        if (Test-Path $candidate) {
            $psqlExe = $candidate
            break
        }
    }
}

$files = @(
    "schema.sql",
    "migration_property_portfolio.sql",
    "migration_add_building_scope.sql",
    "migration_notifications_category.sql",
    "migration_notification_is_read.sql",
    "migrations/20260330_technician_invoice_and_payout.sql",
    "seed.sql"
) | ForEach-Object { Join-Path $here $_ }

foreach ($f in $files) {
    if (-not (Test-Path $f)) {
        throw "Missing file: $f"
    }
}

Write-Host "Nuking public schema on target DB..." -ForegroundColor Yellow
$sqlNuke = @"
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
"@
$sqlNuke | & $psqlExe $DatabaseUrl -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

foreach ($rel in @(
    "schema.sql",
    "migration_property_portfolio.sql",
    "migration_add_building_scope.sql",
    "migration_notifications_category.sql",
    "migration_notification_is_read.sql",
    "migrations/20260330_technician_invoice_and_payout.sql",
    "seed.sql"
)) {
    $path = Join-Path $here $rel
    Write-Host "Applying $rel ..." -ForegroundColor Cyan
    & $psqlExe $DatabaseUrl -v ON_ERROR_STOP=1 -f $path
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green

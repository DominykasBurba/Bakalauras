param(
    [string] $DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
    $DatabaseUrl = "postgresql://postgres:mysecretpassword@localhost:5432/property_management"
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$schema = Join-Path $here "schema.sql"
$seed = Join-Path $here "seed.sql"

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

Write-Host "Applying schema..."
& $psqlExe $DatabaseUrl -v ON_ERROR_STOP=1 -f $schema
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Applying seed..."
& $psqlExe $DatabaseUrl -v ON_ERROR_STOP=1 -f $seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done."

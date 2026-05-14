$ErrorActionPreference = "Stop"
$backend = $PSScriptRoot
$sln = Join-Path $backend "PropertyManager.sln"
$cobertura = Join-Path $backend "PropertyManager.Api.Tests\coverage.cobertura.xml"
$out = Join-Path $backend "coverage\html"

Push-Location $backend
try {
  dotnet tool restore
  dotnet test $sln -c Release -p:CONTROLLER_COVERAGE=true
  if (-not (Test-Path $cobertura)) {
    throw "Coverlet output not found: $cobertura"
  }
  dotnet reportgenerator `
    "-reports:$cobertura" `
    "-targetdir:$out" `
    "-reporttypes:Html" `
    "-title:PropertyManager.Api coverage"
  Write-Host "Open: $(Join-Path $out 'index.html')"
}
finally {
  Pop-Location
}

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$backendRoot = Split-Path $here -Parent

Push-Location $here
try {
  dotnet tool restore --tool-manifest "$backendRoot\.config\dotnet-tools.json"

  $unitExclude = "[PropertyManager.Api]PropertyManager.Api.Helpers.DevelopmentDatabaseBootstrap*%2c[PropertyManager.Api]PropertyManager.Api.Helpers.DemoPortfolioSeed*%2c[PropertyManager.Api]PropertyManager.Api.Helpers.PropertyPortfolioMigration*"
  $unitInclude = "[PropertyManager.Api]PropertyManager.Api.Helpers.*%2c[PropertyManager.Api]PropertyManager.Api.Security.*%2c[PropertyManager.Api]PropertyManager.Api.Services.JwtTokenService"

  dotnet test "$here\PropertyManager.Api.Tests.csproj" `
    -p:CollectCoverage=true `
    -p:CoverletOutputFormat=cobertura `
    -p:CoverletOutput=TestResults/coverage-unit `
    "-p:Include=$unitInclude" `
    "-p:Exclude=$unitExclude" `
    --filter "Category!=Integration"

  $intExclude = "[PropertyManager.Api]PropertyManager.Api.Helpers.DevelopmentDatabaseBootstrap*%2c[PropertyManager.Api]PropertyManager.Api.Helpers.DemoPortfolioSeed*%2c[PropertyManager.Api]PropertyManager.Api.Helpers.PropertyPortfolioMigration*%2c[PropertyManager.Api]*SourceGenerators*%2c[PropertyManager.Api]PropertyManager.Api.Controllers.BillingController%2c[PropertyManager.Api]*OpenApi*"

  dotnet test "$here\PropertyManager.Api.Tests.csproj" `
    -p:CollectCoverage=true `
    -p:CoverletOutputFormat=cobertura `
    -p:CoverletOutput=TestResults/coverage-integration `
    "-p:Include=[PropertyManager.Api]*" `
    "-p:Exclude=$intExclude" `
    "-p:ExcludeByFile=**/Program.cs" `
    --filter "Category=Integration"

  $unitXml = Join-Path $here "TestResults\coverage-unit.cobertura.xml"
  $intXml = Join-Path $here "TestResults\coverage-integration.cobertura.xml"
  if (-not (Test-Path $unitXml)) { throw "Missing: $unitXml" }
  if (-not (Test-Path $intXml)) { throw "Missing: $intXml" }

  $outUnit = Join-Path $here "TestResults\html-unit"
  $outInt = Join-Path $here "TestResults\html-integration"
  New-Item -ItemType Directory -Force -Path $outUnit, $outInt | Out-Null

  dotnet reportgenerator `
    "-reports:$unitXml" `
    "-targetdir:$outUnit" `
    "-reporttypes:Html" `
    "-title:PropertyManager.Api unit-test coverage"

  dotnet reportgenerator `
    "-reports:$intXml" `
    "-targetdir:$outInt" `
    "-reporttypes:Html" `
    "-title:PropertyManager.Api integration-test coverage"

  Write-Host "Updated:"
  Write-Host "  $outUnit\index.html"
  Write-Host "  $outInt\index.html"
}
finally {
  Pop-Location
}

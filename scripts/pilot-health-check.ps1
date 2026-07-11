$ErrorActionPreference = "Stop"

$apiUrl = if ($env:PILOT_HEALTH_API_URL) { $env:PILOT_HEALTH_API_URL } else { "http://localhost:3001/health" }
$swaggerUrl = if ($env:PILOT_HEALTH_SWAGGER_URL) { $env:PILOT_HEALTH_SWAGGER_URL } else { "http://localhost:3001/api/docs" }
$webUrl = if ($env:PILOT_HEALTH_WEB_URL) { $env:PILOT_HEALTH_WEB_URL } else { "http://localhost:3000" }
$mailpitUrl = if ($env:MAILPIT_UI_URL) { $env:MAILPIT_UI_URL } else { "http://localhost:8025" }

function Test-Url($Name, $Url) {
  Write-Host "Checking $Name at $Url"
  $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
    throw "$Name returned HTTP $($response.StatusCode)"
  }
}

Test-Url "API" $apiUrl
Test-Url "Swagger" $swaggerUrl
Test-Url "Web" $webUrl
Test-Url "Mailpit" $mailpitUrl

Write-Host "Docker Compose status:"
docker compose ps

Write-Host "Git branch/tag:"
git branch --show-current
git describe --tags --always

Write-Host "Migration status command to run in pilot environments:"
Write-Host "pnpm db:migrate:deploy"
Write-Host "Pilot health check passed."

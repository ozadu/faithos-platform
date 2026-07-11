#!/usr/bin/env bash
set -euo pipefail

api_url="${PILOT_HEALTH_API_URL:-http://localhost:3001/health}"
swagger_url="${PILOT_HEALTH_SWAGGER_URL:-http://localhost:3001/api/docs}"
web_url="${PILOT_HEALTH_WEB_URL:-http://localhost:3000}"
mailpit_url="${MAILPIT_UI_URL:-http://localhost:8025}"

check_url() {
  local name="$1"
  local url="$2"
  echo "Checking $name at $url"
  curl --fail --silent --show-error --max-time 10 "$url" >/dev/null
}

check_url "API" "$api_url"
check_url "Swagger" "$swagger_url"
check_url "Web" "$web_url"
check_url "Mailpit" "$mailpit_url"

echo "Docker Compose status:"
docker compose ps

echo "Git branch/tag:"
git branch --show-current
git describe --tags --always

echo "Migration status command to run in pilot environments:"
echo "pnpm db:migrate:deploy"
echo "Pilot health check passed."

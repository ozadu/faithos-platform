# Troubleshooting

## Docker daemon not running

- Symptom: `docker compose` commands fail immediately.
- Likely cause: Docker Desktop or Docker Engine is stopped.
- Fix: start Docker and run `docker compose ps`.

## Docker API permission denied

- Symptom: permission denied on `docker_engine`.
- Likely cause: current user cannot access Docker.
- Fix: restart Docker Desktop, check user permissions, and run
  `docker compose ps`.

## Port 3000 already in use

- Symptom: web app cannot bind to port 3000.
- Likely cause: another web process is running.
- Fix: stop the process or change `WEB_PORT`.

## Port 3001 already in use

- Symptom: API cannot bind to port 3001.
- Likely cause: another API process is running.
- Fix: stop the process or change `API_PORT`.

## Database connection failed

- Symptom: API unhealthy or Prisma connection errors.
- Likely cause: `DATABASE_URL` mismatch or unhealthy Postgres container.
- Fix: run `docker compose ps postgres` and `pnpm db:migrate:deploy`.

## Redis connection failed

- Symptom: system health reports Redis down.
- Likely cause: `REDIS_URL` mismatch or Redis container stopped.
- Fix: run `docker compose ps redis`.

## Prisma migration failed

- Symptom: API starts against an old schema or missing tables.
- Likely cause: migrations were not deployed.
- Fix: run `pnpm db:migrate:deploy`.

## JWT secret missing

- Symptom: login/session errors.
- Likely cause: `JWT_SECRET` or `JWT_REFRESH_SECRET` is missing or weak.
- Fix: set strong secrets in `.env`.

## Access token expired

- Symptom: browser redirects to login.
- Likely cause: expired session.
- Fix: log in again; use Logout to clear stale browser state.

## Mailpit not reachable

- Symptom: reset or temporary password email is not visible.
- Likely cause: `SMTP_HOST` or `SMTP_PORT` mismatch.
- Fix: open `http://localhost:8025` and verify SMTP environment variables.

## CSV import validation errors

- Symptom: import preview reports invalid rows.
- Likely cause: invalid email, missing role, missing department code, or
  duplicate user.
- Fix: download the template from `/admin/users/import` and correct rows.

## File upload permission errors

- Symptom: attachment upload fails.
- Likely cause: unsupported file type, size limit, or storage path permission.
- Fix: check `UPLOAD_DIR`, `ATTACHMENT_STORAGE_DIR`, and `MAX_UPLOAD_SIZE`.

## Swagger not loading

- Symptom: `/api/docs` fails.
- Likely cause: API unhealthy or stale container.
- Fix: restart the API and open `http://localhost:3001/health`.

## Browser session stale

- Symptom: page loads but API requests fail.
- Likely cause: old access or refresh token.
- Fix: use Logout, clear site storage if needed, and log in again.

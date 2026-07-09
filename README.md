# FaithOS Platform

FaithOS is a pnpm and Turborepo monorepo containing the web application, API, shared packages, local infrastructure, and identity foundation.

## Prerequisites

- Node.js 24 or newer
- pnpm 11 or newer
- Docker Desktop or Docker Engine with Docker Compose v2
- Git

## Setup

```bash
pnpm install
cp .env.example .env
```

The example environment is for local development only. Replace both JWT secrets before using any shared environment.

## Run with Docker

```bash
docker compose up --build
```

The API container applies checked-in migrations and runs the idempotent seed before NestJS starts. Local endpoints are:

- Web: http://localhost:3000
- API health: http://localhost:3001/health
- Swagger UI: http://localhost:3001/api/docs
- Mailpit UI: http://localhost:8025
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Useful commands:

```bash
docker compose up --build -d
docker compose logs -f
docker compose ps
docker compose down
docker compose down --volumes # permanently removes local data
```

The equivalent helpers are `pnpm docker:up`, `pnpm docker:logs`, and `pnpm docker:down`. PostgreSQL and Redis use persistent named volumes.

## Run applications outside Docker

```bash
docker compose up postgres redis mailpit -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The applications read configuration from the root `.env` and existing process environment variables. Existing variables take precedence.

## Database commands

The Prisma schema, migration, and seed live in `packages/database/prisma`.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:studio
```

The development seed creates:

- Organization: `FaithOS Demo Organization`
- Email: `admin@demo.faithos.local`
- Password: `FaithOS-Demo-2026!`

Never reuse these credentials outside local development.

## Identity API

All identity endpoints use `/api/v1`. Swagger documents request DTOs and bearer authentication.

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET|PATCH /api/v1/organizations/current`
- `GET|POST /api/v1/departments`
- `PATCH|DELETE /api/v1/departments/:id`
- `GET|POST /api/v1/users`
- `GET|PATCH|DELETE /api/v1/users/:id`
- `GET /api/v1/roles`
- `GET /api/v1/permissions`
- `PATCH /api/v1/roles/:id/permissions`

`JWT_SECRET` and `JWT_REFRESH_SECRET` are required. Token lifetimes use `JWT_ACCESS_TTL_SECONDS` and `JWT_REFRESH_TTL_SECONDS`. Passwords and refresh tokens are stored only as Argon2 hashes. API rate limiting is intentionally deferred; the authentication guard boundary is ready for a throttler before public deployment.

## Verify the local environment

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
docker compose exec postgres pg_isready -U faithos -d faithos
docker compose exec redis redis-cli ping
```

Open http://localhost:8025 for Mailpit and http://localhost:3001/api/docs for Swagger.

## DocRoute Core

Sprint 2 introduces the internal document routing MVP.

API endpoints use the `/api/v1` prefix:

- `GET /documents`
- `GET /documents/:id`
- `POST /documents`
- `PATCH /documents/:id`
- `DELETE /documents/:id`
- `POST /documents/:id/submit`
- `POST /documents/:id/forward`
- `POST /documents/:id/return`
- `POST /documents/:id/receive`
- `GET /inbox`
- `GET /sent`
- `GET /drafts`
- `GET /archive`
- `POST /documents/:id/attachments`
- `GET /attachments/:id/download`
- `DELETE /attachments/:id`

The web app includes DocRoute pages for Dashboard, Inbox, Sent, Drafts,
Archive, Documents, Create Document, Search, and Document Detail/Timeline.

Attachments are stored locally. Configure `ATTACHMENT_STORAGE_DIR` when you do
not want the default local `storage/attachments` path.

## Workspace layout

- `apps/web` — Next.js App Router application
- `apps/api` — NestJS identity API
- `packages/database` — Prisma schema, migration, seed, and client exports
- `packages/*` — shared UI, configuration, infrastructure contracts, types, and SDK contracts

## Quality commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Troubleshooting

- **A port is already in use:** stop the conflicting service or change `API_PORT`, `WEB_PORT`, `SMTP_PORT`, or `MAILPIT_UI_PORT` in `.env`.
- **An application remains unhealthy:** run `docker compose ps` and `docker compose logs api web`.
- **Dependencies are stale:** run `docker compose build --no-cache api web`, then restart the stack.
- **Database state must be reset:** run `docker compose down --volumes`, then start the stack again.
- **A migration fails:** confirm `DATABASE_URL`, inspect `docker compose logs postgres`, and rerun `pnpm db:migrate:deploy`.
- **Changes do not hot reload:** confirm the repository is shared with Docker Desktop and restart the affected service.

# FaithOS Platform

FaithOS is organized as a pnpm and Turborepo monorepo. The current milestones provide the platform and local infrastructure foundations only; they intentionally contain no business logic.

## Prerequisites

- Node.js 24 or newer
- pnpm 11 or newer
- Docker Desktop or Docker Engine with Docker Compose v2
- Git

## Setup

Clone the repository, install the workspace dependencies, and create your local environment file:

```bash
pnpm install
cp .env.example .env
```

The values in `.env.example` are intended for local development only. Replace the JWT secrets before using any shared environment.

## Run with Docker

Start the full platform from the repository root:

```bash
docker compose up --build
```

After every service is healthy, the local endpoints are:

- Web: http://localhost:3000
- API health: http://localhost:3001/health
- Mailpit UI: http://localhost:8025
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Useful Docker commands:

```bash
# Start in the background
docker compose up --build -d

# Follow all service logs
docker compose logs -f

# Inspect service health
docker compose ps

# Stop the platform without deleting data
docker compose down

# Stop the platform and delete local database/cache data
docker compose down --volumes
```

The equivalent pnpm helpers are `pnpm docker:up`, `pnpm docker:logs`, and `pnpm docker:down`.

PostgreSQL and Redis use named volumes, so their data survives ordinary container recreation. Source code is bind-mounted into the API and web development containers for hot reload.

## Run applications outside Docker

Start PostgreSQL, Redis, and Mailpit with Docker, then run the applications on the host:

```bash
docker compose up postgres redis mailpit -d
pnpm dev
```

The API and web application read their settings from the root `.env` file and from existing process environment variables. Existing environment variables take precedence.

## Verify the local environment

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
docker compose exec postgres pg_isready -U faithos -d faithos
docker compose exec redis redis-cli ping
```

Open http://localhost:8025 to verify the Mailpit UI.

## Workspace layout

- `apps/web` — Next.js App Router application
- `apps/api` — NestJS application
- `packages/*` — shared UI, configuration, infrastructure contracts, types, and SDK contracts

## Quality commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

## Troubleshooting

- **A port is already in use:** stop the conflicting service or change `API_PORT`, `WEB_PORT`, `SMTP_PORT`, or `MAILPIT_UI_PORT` in `.env`. PostgreSQL and Redis use their standard host ports.
- **An application remains unhealthy:** run `docker compose ps` and `docker compose logs api web`. The apps start only after their required dependencies are ready.
- **Dependencies are stale after a lockfile change:** run `docker compose build --no-cache api web`, then start the stack again.
- **Database state must be reset:** run `docker compose down --volumes`. This permanently removes the local PostgreSQL and Redis volumes.
- **Docker cannot resolve a service:** ensure every service is attached to the `faithos` network with `docker compose config`.
- **Changes do not hot reload:** confirm the repository is shared with Docker Desktop and restart the affected service with `docker compose restart api` or `docker compose restart web`.

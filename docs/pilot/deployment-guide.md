# Pilot Deployment Guide

Prerequisites:

- Node.js 22+
- pnpm 11+
- Docker Compose v2
- PostgreSQL client tools if running backups outside Docker

Recommended local flow:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate:deploy
pnpm db:seed:demo
docker compose up --build -d
```

Verify:

- Web: `http://localhost:3000`
- API health: `http://localhost:3001/health`
- Swagger: `http://localhost:3001/api/docs`
- Mailpit: `http://localhost:8025`

Never commit real `.env` files, JWT secrets, SMTP credentials, or database
dumps.

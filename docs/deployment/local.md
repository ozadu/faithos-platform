# Local Deployment

Use local mode for development and UAT only.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up --build -d
pnpm db:migrate:deploy
pnpm db:seed:demo
```

Local URLs:

- Web: `http://localhost:3000`
- API health: `http://localhost:3001/health`
- Swagger: `http://localhost:3001/api/docs`
- Mailpit: `http://localhost:8025`

Demo seed mode is enabled by default only outside production-like
environments. Set `ENABLE_DEMO_SEED=false` when testing production behavior.

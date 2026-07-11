# Environment Checklist

## Required variables

| Variable                              | Pilot requirement                                          |
| ------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`                        | Must point to the pilot PostgreSQL database.               |
| `REDIS_URL`                           | Must point to the pilot Redis instance.                    |
| `JWT_SECRET`                          | Must be unique, strong, and not a demo value.              |
| `JWT_REFRESH_SECRET`                  | Must be unique, strong, and not the same as `JWT_SECRET`.  |
| `APP_URL` or `WEB_URL`                | Must match the web URL staff will use.                     |
| `SMTP_HOST` and `SMTP_PORT`           | Required for Mailpit/dev email or a configured SMTP relay. |
| `ENABLE_DEMO_SEED`                    | Must be `false` for production-like pilot deployment.      |
| `NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS` | Must be `false` unless running local UAT only.             |

## Safety checks

- Never commit `.env`.
- Never reuse demo JWT secrets.
- Never expose database URLs, SMTP passwords, or JWT values in screenshots or reports.
- Use `/admin/deployment-readiness` to confirm safe environment status.
- Use `/admin/permission-audit` to review sensitive permissions before staff access begins.

## Service checks

```bash
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3001/health
docker compose exec postgres pg_isready -U faithos -d faithos
docker compose exec redis redis-cli ping
```

Expected result: Web and API are healthy, PostgreSQL accepts connections, Redis returns `PONG`, and Mailpit or SMTP is reachable.

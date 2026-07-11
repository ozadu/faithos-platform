# Environment Variables

Required production-like variables:

- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_URL`
- `SMTP_HOST` and `SMTP_PORT` when email notifications are enabled

Important flags:

- `ENABLE_DEMO_SEED`: defaults to `true` locally and must be `false` in
  production-like environments.
- `NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS`: controls whether the web UI shows demo
  credentials.
- `EMAIL_NOTIFICATIONS_ENABLED`: set `false` only when SMTP should be optional.

Never commit real secrets, `.env` files, SMTP credentials, database URLs, or
database dumps.

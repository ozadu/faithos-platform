# Production-Like Deployment

FaithOS v0.8.1 is intended for controlled pilot testing, not broad public SaaS
operation.

Minimum production-like checklist:

1. Copy `.env.production.example` into your deployment secret store.
2. Set strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET` values.
3. Set `ENABLE_DEMO_SEED=false`.
4. Set `NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS=false`.
5. Configure `DATABASE_URL`, `REDIS_URL`, SMTP, `APP_URL`, and `WEB_URL`.
6. Run `pnpm db:migrate:deploy`.
7. Create the first admin through `/setup` if no admin exists.
8. Verify `/health`, `/api/docs`, login, UAT, documents, workflows, reports,
   feedback, and backup scripts.

Startup validation fails clearly when required production configuration is
missing or demo/default JWT secrets are used.

# Pilot UAT Checklist

1. Open `/uat`.
2. Log in with a real admin account. Demo credentials appear only when explicitly
   enabled for development.
3. Verify `/setup` is disabled once an admin exists.
4. Submit feedback at `/feedback`.
5. Review feedback through `GET /api/v1/feedback` or `/admin/feedback`.
6. Verify `/health`, Swagger, Mailpit, documents, workflows, notifications,
   reports, and admin configuration.
7. Run `pnpm backup:db` in a safe environment.
8. Review known limitations in `/uat/report`.

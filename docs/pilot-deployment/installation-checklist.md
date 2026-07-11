# Pilot Installation Checklist

Use this as the technical installer’s first-run checklist.

| Item                                                      | Required       | Status | Notes                                                 |
| --------------------------------------------------------- | -------------- | ------ | ----------------------------------------------------- |
| Docker Desktop or Docker Engine with Compose v2 installed | Yes            | [ ]    | Confirm `docker compose version`.                     |
| WSL2 installed and enabled on Windows hosts               | Yes on Windows | [ ]    | Required for Docker Desktop Linux containers.         |
| Git installed                                             | Yes            | [ ]    | Confirm `git --version`.                              |
| Node.js and pnpm installed if running outside Docker      | Optional       | [ ]    | Required for local `pnpm` commands.                   |
| Repository cloned                                         | Yes            | [ ]    | Use the approved FaithOS repository and branch.       |
| `.env` created from `.env.example`                        | Yes            | [ ]    | Replace all placeholder secrets.                      |
| `ENABLE_DEMO_SEED=false` for pilot                        | Yes            | [ ]    | Do not seed demo data in production-like pilot use.   |
| PostgreSQL starts successfully                            | Yes            | [ ]    | Verify via Docker health or `pg_isready`.             |
| Redis starts successfully                                 | Yes            | [ ]    | Verify `redis-cli ping` returns `PONG`.               |
| Mailpit or SMTP configured                                | Yes            | [ ]    | Mailpit is acceptable for local pilot testing.        |
| API health endpoint passes                                | Yes            | [ ]    | `http://localhost:3001/health`.                       |
| Web app loads                                             | Yes            | [ ]    | `http://localhost:3000`.                              |
| Swagger loads                                             | Yes            | [ ]    | `http://localhost:3001/api/docs`.                     |
| First admin created                                       | Yes            | [ ]    | Use `/setup` only before an admin exists.             |
| Organization profile completed                            | Yes            | [ ]    | Name, slug, email, phone, address, country, timezone. |
| Departments created                                       | Yes            | [ ]    | Include every pilot department.                       |
| Users created                                             | Yes            | [ ]    | Include pilot staff only.                             |
| Roles assigned                                            | Yes            | [ ]    | Confirm via `/admin/users/onboarding`.                |
| Backup tested                                             | Yes            | [ ]    | Run the documented backup helper.                     |
| Restore tested                                            | Yes            | [ ]    | Restore into a safe environment.                      |
| UAT completed                                             | Yes            | [ ]    | Run `/pilot/uat` and capture notes.                   |

Do not begin live pilot usage until every required item is complete or explicitly accepted by the pilot owner.

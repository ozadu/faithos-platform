# FaithOS Platform

FaithOS is organized as a pnpm and Turborepo monorepo. Milestone M0 provides the platform foundation only; it intentionally contains no business logic.

## Prerequisites

- Node.js 24 or newer
- pnpm 11 or newer

## Getting started

```bash
pnpm install
pnpm dev
```

The web application runs at `http://localhost:3000` and the API listens on `http://localhost:3001`.

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

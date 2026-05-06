# Gudang Management (StockPilot)

Gudang management system for Indonesian MSME inventory workflows.

## Setup

```bash
pnpm install
pnpm dev
```

Backend setup:

```bash
cp packages/backend/.env.example packages/backend/.env
pnpm --filter @stockpilot/backend db:migrate
pnpm --filter @stockpilot/backend db:seed
pnpm dev:backend
```

## Build

```bash
pnpm build:all
```

## Tech Stack
- Vue 3
- Tailwind CSS
- Vite
- Pinia
- Fastify
- Prisma
- PostgreSQL

See `docs/backend-pwa-plan.md` for the backend, entitlement, access-control, and PWA offline-sync plan.

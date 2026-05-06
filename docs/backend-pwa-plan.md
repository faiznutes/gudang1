# StockPilot Backend and PWA Implementation

## Findings

- StockPilot now has a backend workspace at `packages/backend`, a shared contract package at `packages/shared`, and the existing Vue frontend at `packages/frontend`.
- The backend is the source of truth for auth, workspace context, subscription/entitlement, inventory, suppliers, stock movement, audit logs, and admin data.
- The frontend stores now call API services instead of owning inventory/supplier/activity state as mock data.
- PWA support includes install metadata, a service worker with app-shell/API GET caching, an IndexedDB queue for offline-safe write operations, and a daily user-facing popup for install/cache/queue status.

## Root Cause Analysis

- The old frontend-only state allowed stale plan access, mock auth, non-transactional stock changes, and hidden-but-accessible routes.
- Entitlement decisions now come from `/api/me/entitlements`, which is refreshed with the auth session and enforced again on backend write routes.
- Stock mutations now run through backend transactions and idempotency records, so retries from PWA sync cannot double-apply the same operation.

## Business Rules

- Every user acts inside exactly one workspace context for normal app routes.
- `super_admin` can access platform admin APIs; workspace users cannot access `/api/admin/*`.
- Trial workspaces receive Pro-level features until `trialEndsAt`; expired trials fall back to active subscription/workspace plan.
- `free`, `starter`, `growth`, `pro`, and `custom` plans define feature access and usage limits.
- Stock out and stock transfer cannot produce negative inventory.
- UI visibility is not an access boundary; backend middleware enforces auth, role, feature, and workspace scope.

## Proposed Architecture / Behavior Changes

- Backend: Fastify + Prisma + PostgreSQL + Zod + JWT access token + httpOnly refresh cookie.
- Shared contracts: role, plan, feature, and entitlement DTO definitions.
- Frontend: auth/session store loads `auth/me`; inventory, supplier, and activity stores are API-backed; router guards redirect locked features to Billing.
- PWA: `public/sw.js` caches shell assets and network-first GET API data; `src/services/offlineQueue.ts` stores offline writes in IndexedDB, replays them with `Idempotency-Key`, and coordinates daily cache refresh timestamps for `PwaStatusPopup`.
- Super admin: admin views read real backend data for dashboard stats, tenant lists, platform users, subscriptions, audit logs, tenant summary, and inventory summary.
- Deployment: frontend Nginx proxies `/api` to the backend service; compose defines frontend, backend, and Postgres services.

## Endpoint Matrix

| Area | Endpoint | Access |
| --- | --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me` | Public/session |
| Entitlements | `GET /api/me/entitlements` | Authenticated |
| Products | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`, `GET /api/products/low-stock` | Workspace auth; create checks product limit |
| Categories | `GET/POST /api/categories` | Workspace auth |
| Warehouses | `GET/POST /api/warehouses`, `GET/PUT/DELETE /api/warehouses/:id` | Workspace auth; create checks warehouse/multi-warehouse rules |
| Inventory | `GET /api/inventory` | Workspace auth |
| Stock | `POST /api/stock-in`, `POST /api/stock-out`, `POST /api/stock-transfer` | Workspace auth + feature entitlement |
| Suppliers | `GET/POST /api/suppliers`, `GET/PUT/DELETE /api/suppliers/:id` | Workspace auth |
| Activity | `GET /api/activities` | Workspace auth |
| Analytics | `GET /api/analytics/summary` | Workspace auth + analytics entitlement |
| Billing | `POST /api/billing/change-plan` | Workspace admin/trial/super admin |
| Admin dashboard | `GET /api/admin/dashboard/stats` | Super admin only |
| Admin users | `GET /api/admin/users`, `GET/PUT/DELETE /api/admin/workspaces/:workspaceId/users/:userId` | Super admin only |
| Admin tenants | `GET /api/admin/workspaces`, `GET /api/admin/workspaces/:id`, `GET /api/admin/workspaces/:id/summary`, `GET /api/admin/workspaces/:id/inventory-summary`, `POST /api/admin/workspaces/:id/suspend`, `POST /api/admin/workspaces/:id/activate` | Super admin only |
| Admin subscriptions | `GET /api/admin/subscriptions`, `GET /api/admin/workspaces/:workspaceId/subscriptions`, `POST /api/admin/workspaces/:workspaceId/subscriptions/change-plan`, `POST /api/admin/workspaces/:workspaceId/subscriptions/cancel` | Super admin only |
| Admin audit logs/settings | `GET /api/admin/audit-logs`, `GET /api/admin/workspaces/:workspaceId/audit-logs`, `GET/PUT /api/admin/settings` | Super admin only |

## Data Model Summary

- Identity and tenancy: `User`, `Workspace`, `WorkspaceMember`.
- Commercial state: `Subscription`, `Entitlement`, `SystemSetting`.
- Inventory domain: `Category`, `Product`, `Warehouse`, `InventoryItem`, `StockMovement`, `Supplier`.
- Operations and safety: `AuditLog`, `SyncOperation`.

## Access Matrix

| Capability | super_admin | admin | staff | supplier | trial |
| --- | --- | --- | --- | --- | --- |
| App dashboard | Yes | Yes | Yes | Limited | Yes |
| Platform admin | Yes | No | No | No | No |
| Product/warehouse read | Yes | Yes | Yes | Limited | Yes |
| Product/warehouse write | Yes | Yes | Yes | No | Yes |
| Stock in/out | Plan gated | Plan gated | Plan gated | No | Yes while active |
| Analytics | Plan gated | Plan gated | Plan gated | No | Yes while active |
| Billing change | Yes | Yes | No | No | Yes |

## Final Implementation Details

- Run backend locally with:
  - `cp packages/backend/.env.example packages/backend/.env`
  - `pnpm --filter @stockpilot/backend db:migrate`
  - `pnpm --filter @stockpilot/backend db:seed`
  - `pnpm dev:backend`
- Default seeded login: `admin@example.com` / `password123`.
- Seeded tenant data includes a platform super admin workspace, one active paid tenant with admin and staff users, and one trial tenant with supplier/trial roles.
- `PwaStatusPopup` stores `stockpilot:pwa-popup-dismissed-date` and `stockpilot:last-cache-refresh-at`; closing the popup hides it until the next local day.
- Service worker messages include `REFRESH_DAILY_CACHE`, `CACHE_REFRESHED`, and `SKIP_WAITING`.
- Write routes accept `Idempotency-Key`; frontend online writes and offline sync both send the key.
- Standard backend errors use `code` values such as `unauthenticated`, `forbidden`, `feature_locked`, `conflict`, and `validation_error`.
- Offline queue statuses are `pending`, `syncing`, `synced`, `failed`, and `needs_review`.

## Validation Scenarios

- Login, register, logout, refresh token, and `auth/me`.
- Direct API access without token returns `401`.
- Non-super-admin access to `/api/admin/*` returns `403`.
- Free plan cannot access stock in/out or analytics route/API.
- Trial active gets Pro features; expired trial falls back to paid/free plan.
- Stock out above available quantity returns `409` and leaves inventory unchanged.
- Transfer updates source and destination in one transaction.
- Upgrade/downgrade refreshes entitlement UI immediately.
- Hidden menu routes are still blocked by router and backend.
- PWA installs, opens cached shell offline, queues safe writes, and syncs when online.
- PWA popup appears once per local day, shows cache freshness/offline queue status, and stays hidden after close until tomorrow.
- Super admin can view tenant/customer data; tenant admins/staff/trial users cannot enter `/admin` or `/api/admin/*`.

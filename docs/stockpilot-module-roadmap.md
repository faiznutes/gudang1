# StockPilot Module Roadmap

## Strategy

StockPilot is a WMS Lite product first. The roadmap prioritizes reliable warehouse operations over broad ERP coverage. A module can enter the product only if it supports repeatable UMKM workflows without client-specific customization.

## Module Status

| Status | Meaning |
| --- | --- |
| Core | Required for WMS Lite and available as product foundation. |
| Premium | Paid plan value with backend enforcement. |
| Add-on | Optional paid capability with higher support or infrastructure cost. |
| Postponed | Valid idea, but not allowed into active routes until core workflows are mature. |
| Never | Explicitly out of scope for StockPilot WMS Lite. |

## Now

Core:

- Tenant admin, auth, workspace context, and role separation.
- Inventory master data: products, categories, low-stock visibility.
- Warehouse management: default warehouse and multi-warehouse foundation.
- Stock movement: stock in, stock out, transfer, idempotency, audit log.
- Supplier directory.
- Activity timeline and in-app notifications.
- Billing, subscription, entitlement, and platform admin controls.
- DB-backed package catalog, add-on catalog, workspace add-on assignment, and subscription lifecycle events.

Premium:

- Analytics summary.
- Import/export.
- Reports and PDF export.

Operational rule:

- Existing tenant behavior stays compatible through legacy plan codes while package/add-on configuration moves to database-backed super admin controls.

## Next Foundation

Build only after the module catalog and contract tests are stable:

- Purchase Order Lite: draft, receive, close; no custom approval workflow.
- Receiving Flow: inbound goods entry connected to stock-in.
- Stock Opname: count session, variance, approval, audited adjustment.
- Barcode/Mobile Scanning UX: scan-first product lookup and stock movement shortcuts.
- Onboarding Checklist: tenant setup steps for product, warehouse, first stock, staff, and supplier.

Acceptance for any next module:

- Has module catalog entry.
- Has feature or plan decision before route is exposed.
- Has backend guard and route-contract coverage.
- Has audit log for every mutation.
- Has E2E smoke for happy path and locked access.

## Later

Build after WMS Lite has stable activation and renewal:

- Sales Invoice Lite: simple outbound document and PDF, without ledger accounting.
- Marketplace Sync: order review queue, SKU matching, retry, conflict visibility.
- WhatsApp Notifications: paid notification channel, not source of truth.
- Public API Integrations: API keys, rate limits, webhooks, audit trail.
- Product Variants: only after SKU/barcode behavior is defined.
- Batch and Expiry: only for segments that pay for lot-level inventory.

## Avoid

Do not build:

- Full accounting, ledger, tax, or bank reconciliation.
- HR, payroll, attendance, or employee administration.
- White-label ERP per client.
- Arbitrary workflow builder.
- Client-specific reports that cannot become standard templates.
- Direct database customization for tenant requests.

## Pricing Direction

Use the current package seed as the default pricing baseline. Super admin can adjust active package/add-on records manually; payment gateway automation remains a later module.

Future pricing shape:

- Free: single warehouse, low product/user limits, basic read/reporting.
- Starter: stock in/out for one warehouse.
- Growth: multi-warehouse and analytics.
- Pro: import/export, PDF, larger limits.
- Custom: integration support, enterprise terms, possible isolation review.

Add-on candidates:

- Extra users, products, or warehouses.
- Batch import/export unlock for lower packages.
- Analytics unlock for selected tenants.
- Future integration or WhatsApp channels after core notification rules stabilize.

Upsell should come from usage and operational maturity:

- More warehouses.
- More users.
- More products.
- Import/export.
- Analytics.
- Integrations.
- Barcode/mobile workflows.

## Anti-Chaos Rules

- No hidden feature without backend guard.
- No new tenant route for postponed or never modules without explicit feature flag and product approval.
- No custom workflow per client.
- No custom database patch per tenant.
- No marketplace write path without idempotency, conflict handling, and audit log.
- No WhatsApp dependency for critical system state.
- No enterprise isolation before signed enterprise value justifies backup, migration, and support cost.

## Source Of Truth

The product strategy contract lives in `@stockpilot/shared` as `MODULE_CATALOG`. Documentation explains why; the catalog keeps tests and future implementation honest.

# StockPilot SaaS WMS Lite Audit

## Executive Recommendation

StockPilot should not become a general ERP in the near term. The best business model is **WMS Lite / ERP Lite for Indonesian UMKM retail and light distribution**: inventory master data, warehouse locations, stock movement, supplier directory, operational alerts, subscription control, and simple reporting.

The harsh truth: building a general ERP too early will turn this product into a custom software service. Accounting, HR, payroll, arbitrary workflows, white-label forks, and client-specific process branches will destroy support leverage before recurring revenue is stable.

Recommended niche:

- UMKM with 1-10 warehouses or branches.
- Retail, distributor, reseller, light procurement, and operational stock teams.
- Businesses that need reliable stock truth more than full enterprise ERP customization.

Do not build yet:

- Full accounting ledger, tax engine, HR, payroll, CRM, POS replacement, or arbitrary workflow builder.
- Deep marketplace sync before stock reconciliation and failure recovery are mature.
- Per-client custom forms, custom approval chains, custom reports, or direct database edits.

Highest leverage:

- Make onboarding fast.
- Make stock movement hard to misuse.
- Make role and entitlement boundaries strict.
- Make pricing modular but simple.
- Make every paid feature enforceable in UI, router, backend, and tests.

## Business Model Audit

Best model: **modular WMS Lite subscription**.

Why this wins:

- Clear buyer pain: stock mismatch, branch visibility, slow stock opname, messy supplier records.
- Lower support burden than general ERP.
- Easier onboarding than accounting or full procurement.
- Strong upsell path from one warehouse to multi-warehouse, import/export, analytics, barcode, and integrations.
- Recurring revenue can grow by warehouse count, user count, product limit, and integration add-ons.

Model comparison:

| Model | Verdict | Reason |
| --- | --- | --- |
| General ERP SaaS | Avoid | Too broad, high customization pressure, high churn if modules feel shallow. |
| Vertical ERP SaaS | Later | Useful after picking a stronger segment, such as distributor or retail branches. |
| Warehouse Management SaaS | Best | Matches current code and clearest operational pain. |
| ERP Lite | Good framing | Use only if "ERP" means inventory operations, not full finance/HR. |
| Distribution ERP | Later | Add after purchase order lite and sales invoice lite are stable. |
| Retail ERP | Later | Requires POS or marketplace decisions; risky too early. |
| Modular SaaS ERP | Good pricing structure | Modules must be standardized, not custom-built per client. |
| White-label ERP | Avoid | Breaks product leverage and multiplies support complexity. |
| Hybrid architecture | Later | Useful for enterprise isolation, not UMKM default. |

## System Architecture Audit

Current architecture is on the right track for WMS Lite:

- Vue frontend, Fastify backend, Prisma/PostgreSQL, shared contracts, PWA cache and offline queue.
- Multi-tenant runtime uses workspace context, strict role separation, route contract tests, and backend guards.
- Database strategy is **shared database + shared schema + strict `workspaceId` isolation**. This is the correct default for UMKM SaaS because it keeps cost, migration, backup, and reporting manageable.

Recommended tenant architecture:

- Default: shared DB and shared schema with every tenant-owned row scoped by `workspaceId`.
- Add indexes on `workspaceId` and high-volume operational timestamps.
- Keep admin platform routes separate under `/api/admin`.
- Do not create database-per-tenant until enterprise deals justify custom backup, restore, SSO, or data residency terms.

Module audit:

| Module | Business value | Main risk | MVP rule | Enterprise-ready rule |
| --- | --- | --- | --- | --- |
| Multi-tenant | Enables SaaS billing and isolation | Tenant data leakage | Single workspace context per request | Optional enterprise isolation later |
| Subscription | Monetization and feature limits | Stale entitlement state | Backend source of truth | Payment gateway and dunning |
| Role permission | Prevents misuse | Hidden menu treated as security | UI + route + backend guard | Permission matrix and audit diff |
| Warehouse | Branch and location control | Confusing default warehouse | One default, optional multi | Location hierarchy and capacity |
| Inventory movement | Stock truth | Negative stock and duplicate retry | Transaction + idempotency | Approval, reconciliation, scan history |
| Purchasing | Better inbound control | Becomes procurement ERP | PO Lite only | Approval and partial receipt |
| Sales | Outbound stock linkage | Becomes accounting/POS | Sales invoice lite only | Integration to accounting provider |
| Reporting | Paid value | Custom report trap | Standard reports | Export jobs and report templates |
| Audit logs | Trust and support | Too noisy to use | Key mutations logged | Filtered timeline and retention |
| Notifications | Operational alerts | Alert fatigue | In-app first | Rules, digest, WhatsApp add-on |
| API integrations | Expansion | Rate-limit and support cost | Add-on only | Webhooks, API keys, quotas |
| Marketplace | Growth | Sync conflicts and oversell | Postpone | Reconciliation queue and retry policy |
| WhatsApp | Familiar channel | Vendor dependency | Postpone | Template approval and fallback |
| Mobile scanning | Warehouse speed | Bad mobile UX | Postpone until workflows stable | Dedicated scan-first app |
| Backup/recovery | Trust | Restore complexity | Daily backups | Tenant-level export/restore |
| Activity tracking | Accountability | Noise | Simple timeline | Assignment and SLA |
| Branch support | Core WMS need | Permission confusion | Warehouse as branch | Branch-level roles |
| Variants | SKU realism | Product model explosion | Postpone | Variant table, barcode, unit rules |
| Batch/expiry | Food/pharma value | Complex costing and picking | Postpone | Lot-level inventory |
| Finance simplification | Owner visibility | Accounting scope creep | Stock value estimate only | Accounting integration |

## Operational Flow Design

Client onboarding:

1. Super admin creates tenant, owner, default warehouse, optional staff, optional supplier seed.
2. Tenant owner logs in and sees setup checklist.
3. Import product template or create products manually.
4. Create warehouse/branch only if plan allows.
5. First stock-in establishes opening balance.

Bottleneck: bad initial data. Mitigation: import template validation and sample CSV.

Trial activation:

1. Prospect requests trial.
2. Platform creates trial workspace with pro-level feature preview.
3. Trial expiry is shown in UI.
4. Expired trial falls back to locked mutation and plan selection.

Never customize trial length per client outside admin-controlled subscription period updates.

Subscription renewal:

1. Workspace has current plan and period.
2. Admin extends period or changes plan.
3. Entitlements refresh immediately.
4. Audit log records plan and period changes.

Failure point: entitlement cache. Mitigation: auth/session refresh and backend checks remain source of truth.

Warehouse receiving:

1. Select supplier or manual source.
2. Select product and destination warehouse.
3. Enter quantity and notes.
4. Backend validates role, feature, active session, product, warehouse, and transaction.
5. Inventory and audit log update atomically.

Purchase order flow, later:

1. Draft PO.
2. Approve or skip approval for small teams.
3. Receive partially or fully.
4. Convert receipt to stock-in.
5. Close PO.

Keep it "PO Lite"; do not support custom approval workflow yet.

Stock transfer:

1. Select product, source warehouse, destination warehouse.
2. Quantity must be available.
3. Source and destination must differ.
4. Transaction decrements source and increments destination.
5. Audit log records movement.

Stock opname, later:

1. Freeze counting session.
2. Scan or enter counted quantity.
3. Show variance.
4. Admin approves adjustment.
5. Adjustment writes stock movement and audit log.

Sales invoice, later:

1. Create simple outbound document.
2. Reserve or reduce stock.
3. Record customer and notes.
4. Export PDF.
5. Do not add ledger/accounting in-product.

Marketplace sync, later:

1. Pull orders into review queue.
2. Match SKU.
3. Apply stock changes only after reconciliation.
4. Failed sync stays visible and retryable.

Never let marketplace integrations directly mutate stock without audit and conflict handling.

Permission flow:

1. Platform role decides admin console access.
2. Workspace role decides tenant actions.
3. Entitlement decides feature access.
4. Activity session decides mutation lock.

Multi-branch flow:

1. Branch equals warehouse for MVP.
2. User sees allowed workspace data.
3. Stock movement always records warehouse context.
4. Branch-specific permissions can wait until branch volume proves need.

Support and ticketing:

1. Keep support outside core product initially.
2. Use audit logs and tenant summary for diagnosis.
3. Add ticketing only after repeated support patterns are known.

Suspension/expired:

1. Suspended tenant cannot mutate.
2. Read-only operational data remains visible where safe.
3. Billing and support CTA stay accessible.

## Product Strategy

Core modules:

- Tenant admin, auth, role guard.
- Inventory, categories, warehouses.
- Stock in, stock out, transfer.
- Supplier directory.
- Activity, audit log, in-app notification.
- Billing and entitlement.

Premium modules:

- Multi-warehouse.
- Analytics.
- Import/export.
- Reports and PDF export.

Add-ons:

- Public API integrations.
- Future marketplace sync.
- Future WhatsApp notifications.
- Future barcode/mobile scanning.

Postpone:

- Purchase order lite.
- Receiving flow.
- Stock opname.
- Sales invoice lite.
- Product variants.
- Batch and expiry.

Never build in this product:

- Full accounting.
- HR/payroll.
- Arbitrary workflow builder.
- White-label client forks.
- Client-specific database patches.

Pricing strategy:

- Free: single warehouse, product limit, read/report basics.
- Starter: stock in/out for one warehouse.
- Growth: multi-warehouse and analytics.
- Pro: import/export, PDF, higher limits.
- Custom: enterprise support, integration add-ons, possible tenant isolation review.

Feature locking rule:

- Every paid feature must be enforced in four layers: menu visibility, route guard, backend guard, and contract test.

Retention strategy:

- Setup checklist.
- Low-stock alerts.
- Import templates.
- Audit trail for owner trust.
- Renewal reminders before access risk.

Referral strategy:

- Offer extra product/user limit for successful referral, not custom features.

## Scalability And Failure Analysis

Likely bottlenecks:

- Large inventory queries without pagination/indexing.
- Marketplace sync retries causing duplicated stock mutation.
- Custom reports becoming support burden.
- Weak onboarding causing churn before activation.
- WhatsApp dependency causing notification failures.
- Tenant cache or service worker serving stale role/entitlement data.

Mitigation:

- Keep idempotency on stock writes.
- Keep route-contract and module-contract tests in CI.
- Add background jobs before marketplace sync.
- Add structured logs and audit filters before enterprise sales.
- Use shared schema until enterprise isolation is paid and operationally justified.
- Monitor health, deploy status, error rates, slow queries, and failed sync operations.

Infrastructure recommendations:

- Continue Docker Compose on Coolify for current stage.
- Keep PostgreSQL managed backup and retention policy documented.
- Add uptime checks for `/api/health`.
- Add application error tracking before launching integrations.

## Final Output

Recommended business model:

- WMS Lite subscription for Indonesian UMKM.

Recommended niche:

- Retail and light distribution teams with stock, supplier, and branch visibility problems.

Recommended module structure:

- Core stock operations now.
- Premium analytics/import/reporting.
- Add-on integrations later.
- Enterprise isolation only for custom contracts.

Recommended tenant architecture:

- Shared database, shared schema, strict workspace scoping.

Recommended MVP scope:

- Keep current core.
- Add onboarding checklist, stronger import validation, receiving, stock opname, and barcode UX before sales/marketplace.

Features to avoid:

- Full ERP, full accounting, HR/payroll, custom workflow builder, white-label forks.

Support risk warning:

- Every client-specific customization becomes a permanent support obligation. If it cannot be standardized, it should not enter SaaS core.

Operational risk warning:

- Stock must remain the source of truth. Any future PO, sales, marketplace, or scanning feature must write through audited inventory movements.

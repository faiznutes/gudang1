# Full ERP UX Audit and Operational Redesign

Date: 2026-05-09

Scope: tenant frontend UX, responsive behavior, product/inventory interaction, reporting/export experience, category management, graph strategy, and production readiness. Backend contracts are treated as stable unless a gap cannot be solved safely in the frontend.

## 1. Full UX Audit Report

StockPilot is strongest when it behaves like a daily warehouse assistant, not a technical SaaS console. The tenant experience should prioritize stock status, product lookup, warehouse movement, operational alerts, and fast actions.

Current quality risks:
- Desktop product tables previously hid the main action behind a three-dot menu inside an overflow table, causing clipping and low discoverability.
- Product detail behavior was inconsistent: mobile nudged users toward item inspection, while desktop required an action menu.
- Reporting existed, but the trend visualization used multiple bars per day, which made the chart crowded and hard to interpret.
- Export is CSV-only even though product expectations include PDF and Excel. The UI should not promise PDF/Excel until the backend export contract exists.
- Category lifecycle is create-only in the current backend contract. Edit, archive, restore, merge, colors, and icons need explicit API and data model support before they can be safely exposed.

## 2. Desktop UX Redesign Recommendations

Recommended desktop pattern:
- Product row click opens a right-side detail drawer.
- Row actions remain visible inline: view, edit, delete.
- Detail drawer provides stock per warehouse, price, category, description, and stock action shortcuts.
- Avoid dropdown menus inside scroll containers for primary operational actions.
- Keep tables dense, but keep the first click predictable and fast.

This preserves desktop efficiency while matching the mobile mental model.

## 3. Product / Inventory Interaction Redesign

Implemented direction:
- Full product row/card is inspectable.
- Desktop no longer relies on the clipped three-dot menu.
- Inline table actions are available without hovering through nested menus.
- Detail drawer gives context without leaving the inventory list.

Recommended next step:
- Preselect product in stock-in/stock-out pages when opened from the drawer.
- Add recent movement inside the drawer once a product-level movement endpoint or efficient local activity index is available.

## 4. Dropdown Overflow Fixes

Primary fix:
- Remove absolute dropdown from the desktop inventory table.
- Replace with inline actions and a drawer.

General rule:
- Do not place essential dropdowns inside containers using `overflow-x-auto`, `overflow-hidden`, virtualized tables, or transformed parents.
- If a dropdown is still needed, render it through a body-level portal/popover component with collision detection.

## 5. Table Usability Improvements

Tables should follow this standard:
- Click row to inspect.
- Keep destructive actions explicit and visually separated.
- Keep status badges readable.
- Use sticky or visible action columns only for high-frequency operations.
- Use mobile cards for narrow screens.
- For large datasets, add pagination or virtualization before tables exceed operational performance limits.

## 6. Reporting / Export Redesign

Current implementation:
- Export service supports CSV downloads for products, warehouses, suppliers, inventory, stock movements, and audit logs.
- Import supports CSV templates and CSV uploads.
- No native PDF or Excel endpoint currently exists.

Recommended reporting layers:
- Immediate: CSV exports for operational spreadsheet use.
- Next: branded PDF reports for printable summaries.
- Next: `.xlsx` exports for structured multi-sheet operational workbooks.
- Later: async export jobs for large date ranges or heavy datasets.

## 7. PDF Export Strategy

PDF reports should be generated server-side or with a dedicated export worker. Required template fields:
- Company logo and workspace name.
- Report title and report code.
- Date range and generated timestamp.
- Summary statistics.
- Clean tables with totals.
- Footer with operator, page number, and optional signature areas.

Recommended PDF report types:
- Inventory summary.
- Stock movement recap.
- Low stock report.
- Warehouse activity.
- Supplier/product listing.

Do not generate large PDFs entirely in the browser for production datasets.

## 8. Excel Export Strategy

Excel should prioritize clean data over visual decoration:
- One sheet for raw rows.
- Optional summary sheet for totals.
- Frozen header row.
- Human-readable column names.
- Stable date and number formats.
- No merged cells in raw data tables.

For large exports, use background jobs and return a downloadable file link.

## 9. Category Management Redesign

Current backend capability:
- `GET /categories`
- `POST /categories`
- Category data includes `id`, `name`, and optional `description`.

Missing capability:
- Edit category.
- Archive category.
- Restore category.
- Merge category.
- Color/icon metadata.

Recommended SME architecture:
- Start with flat categories.
- Avoid deep category hierarchy for now.
- Use tags later only if filtering/import/reporting needs more flexibility.
- Add category merge only with audit log and product reassignment summary.
- Archive should be reversible and must not break historical reporting.

Lowest support complexity solution:
- Flat categories plus optional color/icon metadata.
- No nested subcategories until there is clear demand.

## 10. Graph Visualization Redesign

Implemented direction:
- Replace grouped daily bars with one main net movement area/line chart.
- Keep incoming, outgoing, and net totals as KPI cards near the chart.
- Show key interpretation text below the chart.

Recommended chart types:
- Stock movement trends: net area/line chart plus in/out KPI totals.
- Warehouse activity: horizontal bars by warehouse.
- Sales trends: line chart with revenue and order count separated.
- Inventory mutation: timeline with event density.
- Low stock analytics: ranked list plus simple severity badges.
- Operational performance: KPI cards with compact sparklines.

Avoid:
- Three or more bars per day for long ranges.
- Too many colors.
- Dense legends that require training.

## 11. Responsive Consistency Fixes

Standards:
- Mobile and desktop should share the same core interaction intent.
- Mobile cards can be touch-first, but desktop should still expose clear direct actions.
- Header actions should wrap cleanly.
- Detail drawers should use full width on mobile and constrained width on desktop.
- Tables should not be the only way to understand records.

## 12. ERP Operational UX Improvements

Prioritize:
- Search and filters.
- Low stock indicators.
- Visible stock action shortcuts.
- Clear empty states.
- Fewer hidden menus.
- Fast transitions between list, detail, and mutation flows.

Avoid exposing tenant users to:
- Feature flags.
- API concepts.
- Entitlement internals.
- Subscription mechanics on daily operational pages.

## 13. Frontend Architecture Warnings

Risks to track:
- CSV export is synchronous and browser-triggered.
- Large tables do not yet use pagination or virtualization.
- Category store exposes placeholder update/delete methods that do not match backend capability.
- Report UI should not display PDF/Excel actions until the service contract exists.
- Any future popover/dropdown inside tables should use a portal-based component.

## 14. Production Deployment Checklist

Before release:
- Run backend tests.
- Run full production build.
- Smoke test tenant dashboard, inventory, reports, stock-in, stock-out, and responsive breakpoints.
- Verify no tenant page calls `/api/admin/*`.
- Verify dropdowns, drawers, and modals appear above tables.
- Verify exports download and show errors gracefully.
- Verify expired activity session blocks mutation but keeps read pages usable.

## 15. Performance Optimization Recommendations

Near-term:
- Add pagination or server-side filtering for products and movements.
- Debounce product search when backed by remote queries.
- Avoid rendering large SVG/text labels for very long date ranges.
- Use async exports for large datasets.

Later:
- Add report caching by workspace/date range.
- Add lightweight dashboard summary endpoints when client aggregation becomes too heavy.

## 16. Maintainability Recommendations

Recommended guardrails:
- Shared drawer/popover component for table interactions.
- Shared export action component with clear format support.
- Shared report chart primitives for consistent axis, empty state, and colors.
- Document frontend-only vs backend-required UX requests in product specs before implementation.

## 17. ERP Usability Risk Analysis

High risk:
- Promising PDF/Excel/category lifecycle without backend support.
- Hiding primary actions in clipped menus.
- Overloading dashboards with SaaS internals.

Medium risk:
- CSV-only export may be acceptable for early tenants but weak for professional reporting.
- Client-side report aggregation can become slow with large workspaces.

Low risk:
- Right-side drawer for product inspection is compatible with current routes and API.

## 18. Deployment Readiness Analysis

This slice is deployable if:
- Frontend build passes.
- Backend tests pass.
- Browser smoke confirms inventory drawer and report chart render.
- Existing API contracts remain unchanged.

Not included in this slice:
- Native PDF export.
- Native Excel export.
- Category edit/archive/restore/merge.
- Backend export jobs.

Those should be implemented as explicit backend/product slices because they need durable contracts, audit logs, and database support.

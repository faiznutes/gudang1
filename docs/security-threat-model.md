# Security Threat Model

## Assets
- Tenant credentials
- Session tokens and refresh cookies
- Workspace data
- Billing requests and approval history
- Inventory mutations and audit logs
- Deployment credentials

## Primary Actors
- Tenant admin, staff, supplier
- Super admin
- External attacker
- Browser extension / client-side interference

## Attack Surfaces
- `/api/auth/*`
- `/api/admin/*`
- PWA service worker cache
- Workspace switching and session refresh
- Inventory mutation routes
- CI/CD and deployment secrets

## Threats
- Tenant calling admin endpoints directly
- Stale PWA cache serving the wrong role or workspace state
- Default production secrets leaking to live boot
- Login brute force or refresh abuse
- Session-expired user mutating data
- Unbounded deploy access through leaked tokens

## Controls
- `platform_role` and `workspace_role` separation
- Backend auth and tenant guards
- Production secret validation
- Route-level and global rate limiting
- Explicit proxy trust using `TRUST_PROXY_HOPS`
- Workspace-scoped cache refresh
- Safe service worker fallbacks
- Audit logs for auth and category lifecycle actions

## Residual Risks
- Leaked secrets still require manual rotation
- Browser extensions can block requests or assets
- Misconfigured Coolify secrets can still break deploys
- Incorrect proxy hop settings can make rate-limit identity too broad or too trusting
- Any new route must pass the route-contract test before release

## Security Posture
- Default posture is deny-by-default for admin routes and expired-session writes.
- Production boot should fail fast if secrets or origins are unsafe.
- All tenant-visible mutations should remain auditable and workspace-scoped.

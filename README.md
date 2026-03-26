# Estimate Engine

Multi-tenant estimate and lead capture system for service businesses.

## Stack

- TypeScript backend with Express
- PostgreSQL
- Reusable widget
- Vite demo-site
- Vite portal-site
- Resend-backed lead notification emails

## Project Structure

- `backend/` - API, application layer, domain, and persistence
- `widget/` - embeddable estimate widget
- `demo-site/` - public-only demo and showcase host for the widget
- `portal-site/` - authenticated client portal frontend
- `docs/` - milestone notes and implementation documentation
- `render.yaml` - Render backend deployment config
- `vercel.json` - Vercel demo-site deployment config

## Current Milestone

The backend now has structured observability and operational health probes without changing existing API contracts.

- Added JSON structured logging across backend request handling and runtime events.
- Added request ID middleware with `X-Request-Id` response headers.
- Added request start/end logging with status code and duration for all routes.
- Added business event logs for login, lead creation, pricing config version creation/activation, and lead email delivery outcomes.
- Added `/health`, `/health/db`, and `/health/email` endpoints for operational diagnostics.
- Added a centralized error handler with structured error logging.

Milestone notes:

- [`docs/milestones/observability-and-operational-hardening.md`](./docs/milestones/observability-and-operational-hardening.md)
- [`docs/milestones/backend-critical-flow-tests.md`](./docs/milestones/backend-critical-flow-tests.md)
- [`docs/milestones/http-only-cookie-auth.md`](./docs/milestones/http-only-cookie-auth.md)
- [`docs/milestones/portal-site-split.md`](./docs/milestones/portal-site-split.md)
- [`docs/milestones/pricing-config-versioning.md`](./docs/milestones/pricing-config-versioning.md)
- [`docs/milestones/client-settings-onboarding.md`](./docs/milestones/client-settings-onboarding.md)
- [`docs/milestones/client-dashboard-auth-v1.md`](./docs/milestones/client-dashboard-auth-v1.md)
- [`docs/milestones/lead-email-notifications.md`](./docs/milestones/lead-email-notifications.md)

## Local Development

Backend:

```powershell
cd backend
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5434/estimate_engine"
$env:WIDGET_ORIGIN="http://localhost:4173"
$env:PORTAL_ORIGIN="http://localhost:4174"
$env:RESEND_API_KEY="re_xxxxx"
$env:LEAD_NOTIFICATION_FROM_EMAIL="Estimate Engine <alerts@example.com>"
$env:CLIENT_PORTAL_SESSION_TTL_HOURS="168"
$env:CLIENT_PORTAL_COOKIE_SECURE="false"
$env:CLIENT_PORTAL_COOKIE_SAME_SITE="lax"
npm install
npm run dev
```

Demo-site:

```powershell
cd demo-site
$env:VITE_API_BASE_URL="http://localhost:3000"
$env:VITE_CLIENT_ID="demo"
npm install
npm run dev
```

Portal-site:

```powershell
cd portal-site
$env:VITE_API_BASE_URL="http://localhost:3000"
$env:VITE_DEFAULT_CLIENT_ID="demo"
$env:VITE_PORTAL_TITLE="Estimate Engine Client Portal"
npm install
npm run dev
```

## Backend Deployment on Render

The backend is configured for Render with the repo-managed [`render.yaml`](./render.yaml) file.

Render service settings from `render.yaml`:

- `rootDir: backend`
- `buildCommand: npm install --include=dev && npm run build`
- `startCommand: npm run start`

Required environment variables:

- `DATABASE_URL`
- `WIDGET_ORIGIN`
- `PORTAL_ORIGIN`

Recommended environment variables:

- `NODE_ENV=production`
- `PORT`
- `PGSSLMODE=require` if your hosted PostgreSQL provider requires SSL
- `RESEND_API_KEY` to enable lead notification emails
- `LEAD_NOTIFICATION_FROM_EMAIL` for the sender identity used by Resend
- `LEAD_NOTIFICATION_TIMEOUT_MS=5000`
- `CLIENT_PORTAL_SESSION_TTL_HOURS=168`
- `CLIENT_PORTAL_COOKIE_SECURE=true`
- `CLIENT_PORTAL_COOKIE_SAME_SITE=lax` for same-site deployments, or `none` for cross-site frontend/backend deployments
- `CLIENT_PORTAL_COOKIE_NAME=estimate_engine_portal_session`

Example values:

- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME`
- `WIDGET_ORIGIN=https://your-demo-site.vercel.app`
- `PORTAL_ORIGIN=https://your-portal-site.vercel.app`

Create the Render service:

1. Push this repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Connect the repo and deploy the root `render.yaml`.
4. Enter values for `DATABASE_URL`, `WIDGET_ORIGIN`, and `PORTAL_ORIGIN` when prompted.

Build verification command:

```powershell
cd backend
npm install
npm run build
npm test
```

Hosted database migration command:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/001_initial.sql -f backend/db/migrations/002_lead_notifications.sql -f backend/db/migrations/003_client_portal_auth.sql -f backend/db/migrations/004_client_settings_onboarding.sql -f backend/db/migrations/005_config_versioning_and_audit.sql
```

Incremental migration for an existing deployed database:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/002_lead_notifications.sql
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/003_client_portal_auth.sql
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/004_client_settings_onboarding.sql
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/005_config_versioning_and_audit.sql
```

Configure a tenant notification recipient:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -c "UPDATE clients SET notification_email = 'owner@example.com' WHERE name = 'demo';"
```

Bootstrap a client portal user:

```powershell
cd backend
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
$env:CLIENT_ID="demo"
$env:CLIENT_USER_EMAIL="owner@example.com"
$env:CLIENT_USER_FULL_NAME="Demo Owner"
$env:CLIENT_USER_PASSWORD="change-me-123"
npm run create:client-user
```

## Demo-Site Deployment on Vercel

The demo-site is configured for Vercel with the repo-managed [`vercel.json`](./vercel.json) file.

Vercel config from `vercel.json`:

- installs dependencies from `demo-site/`
- builds `demo-site/`
- serves `demo-site/dist`

This app is intentionally public-only and should be used as the sales/demo surface plus sample widget host.

Required Vercel environment variables:

- `VITE_API_BASE_URL`

Recommended Vercel environment variables:

- `VITE_CLIENT_ID=demo`
- `VITE_LAUNCHER_LABEL=Launch Demo Widget`
- `VITE_MODAL_TITLE=Owned Estimate Demo`

Example production value:

- `VITE_API_BASE_URL=https://your-backend.onrender.com`

Deploy with the Vercel CLI:

```powershell
npm install -g vercel
vercel link
vercel env add VITE_API_BASE_URL production
vercel env add VITE_CLIENT_ID production
vercel env add VITE_LAUNCHER_LABEL production
vercel env add VITE_MODAL_TITLE production
vercel --prod
```

Local production-style build verification:

```powershell
cd demo-site
$env:VITE_API_BASE_URL="http://localhost:3000"
$env:VITE_CLIENT_ID="demo"
npm install
npm run build
```

## Portal-Site Deployment

Deploy `portal-site/` as a separate frontend project.

Suggested project settings:

- root directory: `portal-site`
- install command: `npm install`
- build command: `npm run build`
- output directory: `dist`

Required environment variables:

- `VITE_API_BASE_URL`

Recommended environment variables:

- `VITE_DEFAULT_CLIENT_ID=demo`
- `VITE_PORTAL_TITLE=Estimate Engine Client Portal`

Local production-style build verification:

```powershell
cd portal-site
$env:VITE_API_BASE_URL="http://localhost:3000"
$env:VITE_DEFAULT_CLIENT_ID="demo"
$env:VITE_PORTAL_TITLE="Estimate Engine Client Portal"
npm install
npm run build
```

## Public Smoke Test

After both deployments are live:

1. Open the deployed demo-site URL.
2. Confirm only the public estimator/demo content is shown there.
3. Confirm the launcher button is visible.
4. Open the widget.
5. Confirm the estimate form loads without errors.
6. Submit an estimate and confirm the result renders.
7. Continue to the lead form and submit a lead.
8. Confirm the success state renders.
9. Confirm the browser can call `GET /client-config?clientId=demo` successfully.
10. Confirm the new lead exists in PostgreSQL.
11. Confirm the configured client inbox receives the new lead notification email.
12. Open the deployed portal-site URL and sign in there.
13. Confirm the new lead appears in the dashboard.
14. Update company settings in the portal and confirm the estimator still works with the same tenant slug.
15. Change the pricing config JSON, save it, and confirm the portal shows a new active config version plus history entry.
16. Submit another lead and confirm PostgreSQL stores the newer `config_version_id`.
17. Refresh the portal-site and confirm the session is still resolved from the HttpOnly cookie via `GET /auth/me`.
18. Sign out and confirm the portal returns to the login screen and `POST /auth/logout` clears the cookie-backed session.

Example PostgreSQL verification command:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -c "SELECT leads.id, leads.email, leads.config_version_id, client_config_versions.version_number, leads.estimate_data->>'total' AS total, leads.created_at FROM leads JOIN client_config_versions ON client_config_versions.id = leads.config_version_id ORDER BY leads.id DESC LIMIT 10;"
```

## Client Portal API

Authenticated dashboard endpoints:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /me/leads?limit=25`
- `GET /portal/client`
- `PUT /portal/client`

Pricing versioning notes:

- `GET /client-config?clientId=...` now resolves the active immutable config version for the tenant.
- `POST /estimate` responses include `configVersion.id` and `configVersion.versionNumber`.
- `POST /leads` persists the config version used for the estimate.

## Health Endpoints

Operational endpoints:

- `GET /health` returns process-level liveness data
- `GET /health/db` checks PostgreSQL connectivity
- `GET /health/email` reports whether lead email delivery is configured

Operational notes:

- `/health/email` returns `503` when `RESEND_API_KEY` or `LEAD_NOTIFICATION_FROM_EMAIL` is missing.
- `/health/db` returns `503` when the backend cannot complete a database probe.
- Existing product API contracts are unchanged; these are additive endpoints for diagnostics.

## Backend Tests

Run the backend test suite:

```powershell
cd backend
npm install
npm test
```

Current automated coverage:

- `POST /auth/login`, `GET /auth/me`, and `POST /auth/logout`
- unauthenticated rejection for protected portal routes
- pricing config version creation rules
- unchanged pricing saves not creating a new config version
- changed pricing saves creating a new active config version
- lead creation storing `config_version_id`
- tenant isolation for leads and client settings

Test design notes:

- The suite uses the real SQL migration files from `backend/db/migrations/`.
- Tests run against a deterministic pg-compatible in-memory database via `pg-mem`.
- The backend app is instantiated per test, and test data is reseeded each time to keep flows isolated and repeatable.

## Logging And Observability

Backend logging now emits structured JSON lines.

Included fields:

- `timestamp`
- `level`
- `event`
- `requestId`
- request method/path metadata where available

Request lifecycle coverage:

- every request logs `request_started`
- every request logs `request_completed` with status code and duration
- application errors log through the centralized error handler

Key business events:

- `portal_login_succeeded`
- `lead_created`
- `config_version_created`
- `config_version_activated`
- `lead_notification_sent`
- `lead_notification_failed`

## Cookie Auth Notes

Local development defaults:

- `PORTAL_ORIGIN=http://localhost:4174`
- `CLIENT_PORTAL_COOKIE_SECURE=false`
- `CLIENT_PORTAL_COOKIE_SAME_SITE=lax`

Production guidance:

- Use `HttpOnly` cookies with `Secure=true`.
- Use `CLIENT_PORTAL_COOKIE_SAME_SITE=lax` when backend and portal share the same site.
- Use `CLIENT_PORTAL_COOKIE_SAME_SITE=none` when backend and portal are on different sites and credentialed cross-origin requests are required.
- `PORTAL_ORIGIN` must be the exact portal frontend origin because credentialed CORS cannot use `*`.

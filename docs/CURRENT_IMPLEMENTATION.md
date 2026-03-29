# Current Implementation

## Overview

The current platform runtime consists of four product surfaces inside this repository:

- `apps/backend`
- `apps/demo-site`
- `apps/portal-site`
- `apps/widget`

Today the platform supports a public estimate demo, an authenticated client portal, an embeddable widget, and a TypeScript/Express backend backed by PostgreSQL.

The current implementation supports seeded tenants, self-serve tenant signup, portal login/logout, and cookie-backed portal sessions. Billing remains planned future work and is not implemented in the runtime today.

## Repo Layout

Actual product code in this repository lives under:

- `apps/backend`
- `apps/demo-site`
- `apps/portal-site`
- `apps/widget`

Additional notes:

- The `apps/` refactor is in progress. Git still reflects moved files from legacy top-level folders such as `backend/`, `demo-site/`, `portal-site/`, and `widget/`.
- The Beloved John Dev service website still exists as a separate sibling repository in the workspace and is not part of this repository's runtime surface.

## Backend

### Implemented endpoints

The backend currently mounts these endpoints:

- `GET /health`
- `GET /health/db`
- `GET /health/email`
- `GET /client-config?clientId=...`
- `POST /estimate`
- `POST /leads`
- `POST /auth/login`
- `POST /auth/signup`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /me/leads?limit=...`
- `GET /portal/billing`
- `GET /portal/client`
- `PUT /portal/client`
- `POST /portal/demo/reset`

### Current behavior

The backend currently implements:

- self-serve tenant signup
- portal authentication
- HttpOnly cookie-backed sessions
- transactional tenant bootstrap for signup
- estimate calculation
- lead persistence
- tenant-scoped lead listing
- billing summary read model for authenticated tenants
- tenant-scoped client settings reads and updates
- immutable estimator config versioning
- demo reset for the configured demo tenant
- structured logging
- operational health endpoints

### Not yet implemented

The backend does not currently implement:

- billing checkout
- Paddle integration
- PayPal integration
- billing webhooks
- billing enforcement on existing product flows

## Demo Site

### Current routes/pages

The demo site is a single Vite frontend entrypoint that renders content based on `window.location.pathname`.

Implemented public paths:

- `/`
- `/pricing`
- `/terms`
- `/privacy`
- `/refund`

### Current CTA behavior

Current CTA behavior is:

- the header portal CTA links to the configured portal URL
- the pricing page CTA is contact-driven, not signup- or checkout-driven

The demo site is public-only and does not host authenticated dashboard pages.

## Portal Site

### Current auth behavior

The portal site is a single Vite frontend entrypoint.

Current auth behavior uses:

- `POST /auth/login`
- `POST /auth/signup`
- `GET /auth/me`
- `POST /auth/logout`

Portal API requests use `fetch(..., { credentials: "include" })`.

### Current routes/pages

The current portal frontend is a single app shell. Login, signup, and dashboard behavior are rendered as application states inside one frontend entrypoint rather than separate client-side routes.

Direct visits to `/login` and `/signup` are expected to load the same portal shell in production when the portal deployment is rooted at `apps/portal-site` and uses the app-local Vercel rewrite config.

### Current capabilities

The portal currently supports:

- sign in
- create a new tenant account
- restore session from the server-managed cookie
- view recent leads and summary metrics
- update company name
- update phone
- update notification email
- update logo URL
- edit estimator config JSON
- view config version history
- reset demo tenant state when allowed

The portal does not currently implement billing workflows.

## Widget

### Current capabilities

The widget currently:

- fetches client config from the backend
- loads tenant branding and estimator config
- calculates estimates
- collects lead details
- submits leads with the estimate snapshot and config version
- renders a branded multi-step modal flow

## Database

### Current tables actually in use

The current runtime uses these tables:

- `clients`
- `client_branding`
- `client_config`
- `leads`
- `client_users`
- `client_sessions`
- `client_config_versions`
- `audit_logs`
- `billing_customers`
- `subscriptions`
- `raw_billing_events`
- `processed_webhook_events`

Notes:

- `client_config` still exists in the schema.
- Active runtime config resolution now uses `client_config_versions` together with `clients.active_config_version_id`.
- `clients.is_system_client` is used to protect the seeded demo tenant from self-serve signup collisions.

## Tests as Runtime Truth

The strongest runtime-truth automated reference is:

- `apps/backend/src/test/backendFlows.test.ts`

Runtime truth for this document was also derived from:

- backend route modules
- backend SQL migrations
- frontend API clients
- frontend entrypoints

## Known Drift From Target Docs

Current drift that should be standardized later:

- target docs mention `GET /tenant-config`, while the current backend implements `GET /client-config`
- target docs mention `POST /lead`, while the current backend implements `POST /leads`
- target docs mention `GET /auth/session`, while the current backend implements `GET /auth/me`
- target docs describe signup as a routed flow with trial/billing language, while the current runtime implements billing-free signup inside the single portal shell
- target docs describe routed portal pages such as `/dashboard`, `/billing`, and `/account`, but the current portal is a single app shell with state-based rendering
- target docs describe billing architecture and provider flows, but billing is not implemented in the runtime today
- target docs describe a fuller billing system, while the current runtime only exposes a normalized billing summary read model
- older docs and examples still use legacy top-level paths instead of the current `apps/*` layout

## Current Request Flows

### Public Estimate Flow

Visitor -> demo-site or widget -> `POST /estimate` -> `POST /leads` -> Postgres -> email notification -> visible in portal

### Portal Signup Flow

Portal shell -> `POST /auth/signup` -> tenant bootstrap transaction -> session cookie -> `GET /auth/me` + `GET /me/leads` + `GET /portal/client` -> portal loads data

### Portal Login Flow

Portal shell -> `POST /auth/login` -> session cookie -> `GET /auth/me` + `GET /me/leads` + `GET /portal/client` -> portal loads data

### Portal Leads Flow

Portal -> `GET /me/leads` -> backend -> Postgres -> return tenant-scoped leads

### Portal Billing Flow

Portal -> `GET /portal/billing` -> backend -> normalized internal billing summary -> return current enforcement state, subscription snapshot, and derived entitlements

### Portal Settings Flow

Portal -> `GET /portal/client`
Portal -> `PUT /portal/client`
Backend -> update config -> create config version -> audit log

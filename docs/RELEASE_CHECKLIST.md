# Release Checklist

## Repository Hygiene

- Run `npm install` from the repository root.
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Confirm no generated artifacts are staged: `node_modules/`, `dist/`, `.vercel/`, `.turbo/`, logs, coverage, or local `.env` files.
- Confirm `.env.example` and `.env.production.example` files remain trackable when present.

## Backend: Render

- Confirm `render.yaml` uses `rootDir: apps/backend`.
- Configure `DATABASE_URL`, `WIDGET_ORIGIN`, and `PORTAL_ORIGIN`.
- Configure `CLIENT_PORTAL_COOKIE_SECURE=true` in production.
- Configure `CLIENT_PORTAL_COOKIE_SAME_SITE` for the deployed frontend/backend relationship.
- Apply database migrations through `apps/backend/db/migrations/007_billing_foundation.sql`.
- Verify `GET /health`, `GET /health/db`, and `GET /health/email`.
- Verify estimate calculation, lead creation, tenant-scoped portal reads, signup, login, and logout.

## Demo Site: Vercel

- Deploy as a separate frontend project.
- Either use the repository root `vercel.json` for the demo build or set Vercel root directory to `apps/demo-site`.
- Configure `VITE_API_BASE_URL`.
- Verify `/`, `/pricing`, `/terms`, `/privacy`, and `/refund`.
- Verify CTA links point to the portal deployment.
- Verify the demo widget can fetch config, calculate an estimate, and submit a lead.

## Portal Site: Vercel

- Deploy as a separate frontend project rooted at `apps/portal-site`.
- Configure `VITE_API_BASE_URL`.
- Verify `/login` and `/signup` load through the app-local Vercel rewrites.
- Verify signup, login, session restore, logout, dashboard metrics, lead listing, settings save, config version history, and billing summary.

## Widget

- Run `npm run build:widget`.
- Confirm `apps/widget/dist/estimate-engine-widget.es.js` exists.
- Confirm `apps/widget/dist/estimate-engine-widget.iife.js` exists.
- Confirm `apps/widget/dist/index.d.ts` exists.
- Smoke test the IIFE bundle on an external host page with an explicit `apiBaseUrl` and `clientId`.

## Cross-Domain Checks

- Demo site can call the API from `WIDGET_ORIGIN`.
- Portal site can make credentialed API calls from `PORTAL_ORIGIN`.
- Portal cookies have the expected `Secure` and `SameSite` attributes.
- New leads submitted through the widget appear in the portal.
- Notification email delivery works when Resend variables are configured.

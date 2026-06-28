# Repository Structure

## Repositories

### Service website repo

`belovedjohndev-website`

Purpose:

- public service/business website
- deployed at `https://belovedjohndev.com`

### Product platform repo

`belovedjohndev-estimate-engine-platform`

Purpose:

- Estimate Engine product surfaces and backend
- deployed across Render, Vercel, and PostgreSQL hosting

## Platform Layout

```text
belovedjohndev-estimate-engine-platform/
  package.json
  package-lock.json
  render.yaml
  vercel.json
  apps/
    backend/
      package.json
      db/migrations/
      src/
    demo-site/
      package.json
      vercel.json
      vite.config.ts
      src/
    portal-site/
      package.json
      vercel.json
      vite.config.ts
      src/
    widget/
      package.json
      tsconfig.json
      vite.config.ts
      src/
  docs/
```

The root `package.json` is an npm workspace coordinator. It does not own product runtime behavior. App-level package scripts remain the source of truth.

## App Boundaries

### apps/backend

Owns:

- Express API
- domain/application/infrastructure/http module structure
- PostgreSQL migrations and persistence
- auth/session handling
- lead persistence
- estimate calculation
- billing checkout/webhook foundation
- tenant-scoped data access

Deployment:

- Render web service through root `render.yaml`
- `rootDir: apps/backend`

### apps/demo-site

Owns:

- public product demo
- pricing
- terms
- privacy
- refund
- public CTA links to the portal
- sample host for the widget

Deployment:

- Vercel project, either from root `vercel.json` or with project root set to `apps/demo-site`

### apps/portal-site

Owns:

- login
- signup
- authenticated dashboard shell
- leads
- settings
- config version history
- billing summary and checkout trigger

Deployment:

- separate Vercel project rooted at `apps/portal-site`

### apps/widget

Owns:

- embeddable estimator source
- `mountWidget(container, config)` browser API
- Vite library build output under `apps/widget/dist`

Build output:

- `estimate-engine-widget.es.js`
- `estimate-engine-widget.iife.js`
- `index.d.ts`

## Root Scripts

```text
npm run dev:backend
npm run dev:demo
npm run dev:portal
npm run build
npm run build:backend
npm run build:demo
npm run build:portal
npm run build:widget
npm run typecheck
npm test
```

## Refactor Note

The platform code is intentionally grouped under `apps/*` to clarify deployment and ownership boundaries. Legacy top-level app folders should not be reintroduced.

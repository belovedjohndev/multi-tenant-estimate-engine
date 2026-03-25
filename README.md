# Estimate Engine

Multi-tenant estimate and lead capture system for service businesses.

## Stack

- TypeScript backend with Express
- PostgreSQL
- Reusable widget
- Vite demo-site

## Project Structure

- `backend/` - API, application layer, domain, and persistence
- `widget/` - embeddable estimate widget
- `demo-site/` - owned demo host for the widget
- `render.yaml` - Render backend deployment config
- `vercel.json` - Vercel demo-site deployment config

## Local Development

Backend:

```powershell
cd backend
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5434/estimate_engine"
$env:WIDGET_ORIGIN="http://localhost:4173"
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

## Backend Deployment on Render

The backend is configured for Render with the repo-managed [`render.yaml`](./render.yaml) file.

Render service settings from `render.yaml`:

- `rootDir: backend`
- `buildCommand: npm install --include=dev && npm run build`
- `startCommand: npm run start`

Required environment variables:

- `DATABASE_URL`
- `WIDGET_ORIGIN`

Recommended environment variables:

- `NODE_ENV=production`
- `PORT`
- `PGSSLMODE=require` if your hosted PostgreSQL provider requires SSL

Example values:

- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME`
- `WIDGET_ORIGIN=https://your-demo-site.vercel.app`

Create the Render service:

1. Push this repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Connect the repo and deploy the root `render.yaml`.
4. Enter values for `DATABASE_URL` and `WIDGET_ORIGIN` when prompted.

Build verification command:

```powershell
cd backend
npm install
npm run build
```

Hosted database migration command:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/001_initial.sql
```

## Demo-Site Deployment on Vercel

The demo-site is configured for Vercel with the repo-managed [`vercel.json`](./vercel.json) file.

Vercel config from `vercel.json`:

- installs dependencies from `demo-site/`
- builds `demo-site/`
- serves `demo-site/dist`

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

## Public Smoke Test

After both deployments are live:

1. Open the deployed demo-site URL.
2. Confirm the launcher button is visible.
3. Open the widget.
4. Confirm the estimate form loads without errors.
5. Submit an estimate and confirm the result renders.
6. Continue to the lead form and submit a lead.
7. Confirm the success state renders.
8. Confirm the browser can call `GET /client-config?clientId=demo` successfully.
9. Confirm the new lead exists in PostgreSQL.

Example PostgreSQL verification command:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -c "SELECT id, email, estimate_data->>'total' AS total, created_at FROM leads ORDER BY id DESC LIMIT 10;"
```

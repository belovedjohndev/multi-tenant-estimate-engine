# Client Dashboard Auth v1

This milestone adds the first authenticated client-facing surface to the estimate engine.

## What Changed

- Added tenant-scoped `client_users` and `client_sessions` tables.
- Added session-based authentication for client portal access.
- Added protected backend endpoints for login, current session, logout, and recent lead listing.
- Expanded the demo-site so it now presents both the public widget flow and a private dashboard view.
- Added a bootstrap script to create the first client portal user without manual password hashing.

## Database Migration

Run the new migration on an existing database:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/003_client_portal_auth.sql
```

For a new database, apply migrations in order:

1. `001_initial.sql`
2. `002_lead_notifications.sql`
3. `003_client_portal_auth.sql`

## Bootstrap a Client User

```powershell
cd backend
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
$env:CLIENT_ID="demo"
$env:CLIENT_USER_EMAIL="owner@example.com"
$env:CLIENT_USER_FULL_NAME="Demo Owner"
$env:CLIENT_USER_PASSWORD="change-me-123"
npm run create:client-user
```

## Environment Variables

- `CLIENT_PORTAL_SESSION_TTL_HOURS` optional, defaults to `168`
- Existing notification email env vars still apply

## Auth Endpoints

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /me/leads?limit=25`

All protected endpoints require an `Authorization: Bearer <token>` header.

## Smoke Test

1. Run the `003_client_portal_auth.sql` migration.
2. Create a client portal user with `npm run create:client-user`.
3. Open the deployed demo-site.
4. Sign in through the client portal panel.
5. Submit a lead through the widget.
6. Refresh the dashboard and confirm the lead appears for the signed-in tenant.

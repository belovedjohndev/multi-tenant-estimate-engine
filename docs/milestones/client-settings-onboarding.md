# Client Settings / Onboarding

This milestone adds tenant-safe client profile editing inside the authenticated portal.

## What Changed

- Added editable `company_name` and `phone` fields on `clients`.
- Added protected `GET /portal/client` and `PUT /portal/client` endpoints.
- Added portal UI for updating company name, logo URL, phone, notification email, and pricing config JSON.
- Kept the existing `clients.name` field as the stable tenant slug so the widget flow continues to work without changing `clientId`.

## Important Design Note

`clients.name` remains the immutable tenant identifier used by the estimator widget and public API contract.

`company_name` is the editable display name shown in the portal.

That separation is what allows client onboarding/settings changes without breaking the live estimator flow.

## Database Migration

Run this on an existing database:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/004_client_settings_onboarding.sql
```

## API Endpoints

- `GET /portal/client`
- `PUT /portal/client`

Both endpoints require portal authentication and always operate on the signed-in tenant.

## Editable Fields

- Company name
- Logo URL
- Phone
- Notification email
- Estimator pricing config JSON

## Smoke Test

1. Run `004_client_settings_onboarding.sql`.
2. Sign in through the client portal.
3. Update company name, phone, and notification email.
4. Change the pricing config JSON and save it.
5. Refresh the portal and confirm the saved values persist.
6. Open the widget and confirm estimate calculations still work for the same `clientId`.

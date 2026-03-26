# Lead Email Notifications

This milestone adds the first SaaS-oriented operational feature to the estimate engine: tenant-specific lead alert emails.

## What Changed

- Added `clients.notification_email` so each tenant can route notifications to its own inbox.
- Added `leads.estimate_input` so the original estimator selections are stored alongside the calculated estimate snapshot.
- Added a backend email service that sends a lead alert through the Resend Email API.
- Kept lead persistence as the primary action. Email delivery is best-effort and does not fail the `POST /leads` request.

## Environment Variables

- `RESEND_API_KEY`
- `LEAD_NOTIFICATION_FROM_EMAIL`
- `LEAD_NOTIFICATION_TIMEOUT_MS` optional, defaults to `5000`

If the client has no `notification_email`, or the email env vars are not configured, the lead is still stored and the notification is skipped.

## Database Changes

Run this on an existing deployed database:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/002_lead_notifications.sql
```

Set a notification recipient for the demo tenant:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -c "UPDATE clients SET notification_email = 'owner@example.com' WHERE name = 'demo';"
```

## Email Contents

Each notification email includes:

- Lead name
- Lead email
- Lead phone
- Estimate total
- Estimate breakdown
- Original estimate inputs

## Smoke Test

1. Configure `RESEND_API_KEY` and `LEAD_NOTIFICATION_FROM_EMAIL` on the backend.
2. Set `clients.notification_email` for the tenant you are testing.
3. Submit a new lead through the widget.
4. Verify the lead row is inserted.
5. Verify the tenant inbox receives the notification email.

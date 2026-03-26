# Pricing Config Versioning

This milestone makes estimator pricing changes immutable, traceable, and safe for production tenant usage.

## What Changed

- Added `client_config_versions` as the source of truth for estimator pricing.
- Added `clients.active_config_version_id` so each tenant resolves one active pricing version at a time.
- Added `leads.config_version_id` so every lead keeps the exact pricing version used at submission time.
- Added lightweight `audit_logs` entries for config version creation and activation changes.
- Updated the portal settings flow to create a new config version only when the pricing JSON meaningfully changes.
- Updated the portal UI to show the current config version and recent config history metadata.

## Backfill Behavior

Existing tenants are backfilled to version `1` using their current `client_config.estimator_config` values.

Existing leads are backfilled to the tenant's active config version during migration so lead history remains queryable after rollout.

## Public Flow Safety

The stable tenant slug in `clients.name` is unchanged.

The public estimator still resolves config by `clientId`, but the backend now serves the tenant's active immutable config version under the hood.

## Migration

Run this on an existing database:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f backend/db/migrations/005_config_versioning_and_audit.sql
```

## Audit Events

- `config_version_created`
- `config_version_activated`

## Smoke Test

1. Run `005_config_versioning_and_audit.sql`.
2. Sign in to the client portal.
3. Confirm the settings panel shows `Current Config Version v1` for an existing tenant.
4. Save the same pricing JSON and confirm no new history row appears.
5. Change the pricing JSON and save again.
6. Confirm the portal shows a new active version and a new history entry.
7. Submit a fresh estimate and lead through the widget.
8. Confirm the latest lead row stores `config_version_id`.
9. Confirm the joined config version number matches the portal's active version.

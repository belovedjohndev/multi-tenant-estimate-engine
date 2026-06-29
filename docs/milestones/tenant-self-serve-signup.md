# Tenant Self-Serve Signup

> Status: Implemented and deployed. Use `docs/CURRENT_IMPLEMENTATION.md` for live runtime truth. This milestone document remains the implementation record for the signup rollout.

This milestone adds a self-serve tenant signup flow to the current platform runtime without introducing billing or routed portal pages.

## Summary

The current platform already supports:

- seeded tenants
- portal login with HttpOnly cookie-backed sessions
- tenant-scoped settings
- immutable estimator config versioning

This milestone adds the missing self-serve onboarding path so a new tenant can:

- create a new client/tenant
- create the first portal user
- initialize branding/config defaults
- create the initial active config version
- receive an authenticated session immediately
- land inside the existing portal shell

This milestone is intentionally billing-free. It must remain compatible with future Paddle-backed billing, but must not implement billing behavior now.

## Current State

Runtime truth for this milestone comes from [`docs/CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).

Current runtime behavior relevant to signup:

- `portal-site` is a single app shell, not a routed `/signup` page
- backend auth currently implements:
  - `POST /auth/login`
  - `POST /auth/signup`
  - `GET /auth/me`
  - `POST /auth/logout`
- active estimator config resolution already depends on:
  - `client_config_versions`
  - `clients.active_config_version_id`
- seeded/demo tenants already exist and must remain protected
- billing is not implemented

Original schema constraint that this milestone addressed:

- `clients.active_config_version_id` is currently required, which creates a bootstrap cycle for creating a brand-new tenant and its first config version transactionally

## Goals of This Milestone

- Add self-serve tenant signup to the current runtime architecture
- Preserve the existing boundary between:
  - `demo-site` as public marketing/demo
  - `portal-site` as the authenticated app shell
  - `backend` as tenant/auth/config/leads logic
- Create the tenant, first user, initial branding defaults, and initial config version in one transactional flow
- Start an authenticated session immediately after successful signup
- Reuse the current portal shell rather than introducing routed portal pages
- Keep the resulting tenant model compatible with a future Paddle-based billing layer
- Protect seeded/system/demo tenants and existing login behavior

## Non-Goals

This milestone does not implement:

- billing
- Paddle
- PayPal
- subscription tables or entitlements
- billing webhooks
- checkout UI
- routed portal pages such as `/signup`, `/dashboard`, or `/billing`
- demo-site checkout or signup routing changes beyond linking into the existing portal shell later if desired

## Schema Changes

### Purpose

The schema needs one bootstrap fix and one tenant classification field:

- allow a `clients` row to exist before its first config version is inserted
- mark seeded/system tenants so self-serve signup can protect them cleanly

### Exact SQL migration

Create:

- `apps/backend/db/migrations/006_self_serve_signup.sql`

Migration contents:

```sql
BEGIN;

ALTER TABLE clients
ALTER COLUMN active_config_version_id DROP NOT NULL;

ALTER TABLE clients
ADD COLUMN is_system_client BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE clients
SET is_system_client = TRUE
WHERE name = 'demo';

COMMIT;
```

### Notes

- `client_config` remains in the schema and is not removed in this milestone.
- Runtime config resolution continues to use `client_config_versions` and `clients.active_config_version_id`.
- `is_system_client` is introduced for protection and future administrative logic, not billing.

## Required Migrations

For an existing deployed database:

```powershell
psql "postgresql://USER:PASSWORD@HOST:5432/DBNAME" -f apps/backend/db/migrations/006_self_serve_signup.sql
```

For a new database, apply migrations in order:

1. `001_initial.sql`
2. `002_lead_notifications.sql`
3. `003_client_portal_auth.sql`
4. `004_client_settings_onboarding.sql`
5. `005_config_versioning_and_audit.sql`
6. `006_self_serve_signup.sql`

## Transaction Flow

Signup must run as a single backend transaction.

Step-by-step flow:

1. Validate and normalize request input.
2. Normalize `clientId` into the permanent tenant slug used for login and widget resolution.
3. Reject reserved/system slugs such as `demo`.
4. Check whether the requested `clientId` already exists.
5. Hash the password.
6. Begin transaction.
7. Insert `clients` row with:
   - `name = normalized clientId`
   - `company_name = provided company name`
   - `phone = provided phone or null`
   - `notification_email = signup email`
   - `active_config_version_id = NULL`
   - `is_system_client = FALSE`
8. Insert first `client_users` row for the owner account.
9. Insert initial `client_branding` row with default branding values.
10. Insert first `client_config_versions` row at `version_number = 1` using the default estimator config and the new `client_user` as creator.
11. Update `clients.active_config_version_id` to the inserted version id.
12. Insert audit log entries for:
   - `config_version_created`
   - `config_version_activated`
   - optional `portal_signup_completed`
13. Insert `client_sessions` row for the new owner user.
14. Commit transaction.
15. Set the existing portal session cookie.
16. Return the same response shape currently used by login.
17. Portal frontend hydrates with the existing `GET /auth/me`, `GET /me/leads`, and `GET /portal/client` flow.

### Default bootstrap values

Initial branding defaults:

- `logo_url = NULL`
- `primary_color = '#1d4ed8'`
- `secondary_color = '#0f766e'`
- `font_family = 'Avenir Next'`

Initial estimator config:

```json
{
  "basePrice": 100,
  "multipliers": {
    "size": 1.5,
    "complexity": 2
  },
  "discounts": {
    "bulk": 0.1
  }
}
```

## API Contract for `POST /auth/signup`

### Request

`POST /auth/signup`

Request body:

```json
{
  "clientId": "acme-home",
  "companyName": "Acme Home Services",
  "fullName": "Jane Owner",
  "email": "owner@acme.com",
  "password": "change-me-123",
  "phone": "555-1234"
}
```

### Success response

Status:

- `201 Created`

Response body:

```json
{
  "success": true,
  "data": {
    "expiresAt": "2026-04-05T12:00:00.000Z",
    "user": {
      "id": 12,
      "email": "owner@acme.com",
      "fullName": "Jane Owner"
    },
    "client": {
      "id": 8,
      "name": "acme-home"
    }
  }
}
```

Cookie behavior:

- sets the same HttpOnly portal session cookie used by `POST /auth/login`

### Response contract rules

- Signup should return the same shape as the current login response to minimize portal-side branching.
- The newly created session should be immediately valid for `GET /auth/me`.

## Validation Rules

### `clientId`

- required
- trimmed and lowercased
- 3 to 50 characters
- allowed characters: `a-z`, `0-9`, `-`
- must start and end with an alphanumeric character
- must not be a reserved/system slug such as `demo`

Recommended pattern:

- `^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$`

### `companyName`

- required
- trimmed
- non-empty
- maximum 255 characters

### `fullName`

- required
- trimmed
- non-empty
- maximum 255 characters

### `email`

- required
- trimmed
- lowercased
- valid email format

### `password`

- required
- minimum 8 characters
- no stronger policy is introduced in this milestone unless the team chooses to tighten login rules at the same time

### `phone`

- optional
- if provided, must be a non-empty trimmed string
- maximum 32 characters to match the current schema

## Error Handling and Status Codes

### Expected statuses

- `201 Created`
- `400 Bad Request`
- `401` is not expected for signup
- `409 Conflict`
- `500 Internal Server Error`

### Error codes

Validation failures:

- `invalid_body`

Conflict failures:

- `client_id_unavailable`
- `reserved_client_id`

Unexpected failures:

- `internal_server_error`

### Rules

- If `clientId` is already taken, return `409 client_id_unavailable`.
- If `clientId` is reserved for system/demo use, return `409 reserved_client_id`.
- If the transaction fails, do not set the session cookie.
- Existing login error behavior must remain unchanged.

## Backend Application and Service Design

### New endpoint

Added:

- `POST /auth/signup`

### New application use case

Added:

- `apps/backend/src/application/registerPortalTenant.ts`

Responsibilities:

- validate business rules that are not just shape validation
- normalize signup input
- orchestrate tenant creation
- create first session
- return login-compatible response payload

### New transactional repository/helper

Added:

- `apps/backend/src/infrastructure/tenantSignupRepository.ts`

Responsibilities:

- perform the multi-table tenant bootstrap inside one DB transaction
- insert tenant, branding, first user, first config version, audit logs, and session

### Existing backend files expected to change

- `apps/backend/src/modules/auth.ts`
- `apps/backend/src/http/validation.ts`
- `apps/backend/src/application/errors.ts`
- `apps/backend/src/infrastructure/clientRepository.ts`
- `apps/backend/src/infrastructure/clientUserRepository.ts`

## Portal UI Changes

The portal must stay a single-shell app in this milestone.

### Required UI behavior

- add a mode switch inside the existing auth surface:
  - `Sign In`
  - `Create Account`
- render a signup form in the same shell instead of adding a routed `/signup` page
- after successful signup:
  - reuse the existing dashboard hydration flow
  - land in the current ready state of the portal shell

### Signup form fields

- Company name
- Company ID
- Full name
- Email
- Password
- Confirm password
- Phone optional

### UI validation

- basic required field validation before request
- password confirmation must match
- show backend conflict errors clearly for:
  - unavailable company id
  - reserved company id

### Optional URL behavior

If a portal deep link is needed later, support may be added through a query mode such as:

- `/?mode=signup`

This remains inside the same single app shell and does not create new routed pages.

## Test Plan

### Backend tests

Add or update backend flow tests to cover:

- successful signup creates:
  - `clients`
  - `client_users`
  - `client_branding`
  - `client_config_versions`
  - `client_sessions`
- successful signup sets `clients.active_config_version_id`
- successful signup returns login-compatible response shape
- successful signup sets the session cookie
- newly signed-up tenant can immediately call:
  - `GET /auth/me`
  - `GET /me/leads`
  - `GET /portal/client`
- duplicate `clientId` returns `409 client_id_unavailable`
- reserved `clientId` returns `409 reserved_client_id`
- invalid payload returns `400 invalid_body`
- signup transaction does not partially persist on failure
- existing login flow still works for seeded/demo users
- demo reset availability remains restricted to the demo tenant

### Portal tests

At minimum, cover:

- mode switch from sign-in to signup view
- client-side validation for required fields and password confirmation
- successful signup transitions into the existing dashboard load path
- signup conflict errors render correctly
- existing sign-in flow still works unchanged

If no frontend test harness exists yet, these checks should be executed as manual smoke tests during the first implementation pass.

## Rollback Plan

### Application rollback

If signup deployment needs to be rolled back:

1. Roll back the portal deployment.
2. Roll back the backend deployment.

### Migration rollback

The migration is intentionally backward-compatible and should usually remain in place:

- dropping `NOT NULL` from `clients.active_config_version_id` is safe for existing runtime behavior
- adding `is_system_client` with a default is additive

Preferred rollback strategy:

- leave migration `006_self_serve_signup.sql` applied
- roll back backend and portal code only

Only perform a schema rollback if absolutely necessary and only after confirming:

- no `clients` rows remain with `active_config_version_id IS NULL`
- no application code depends on `is_system_client`

## Risks and Mitigations

### Bootstrap cycle for `active_config_version_id`

Risk:

- current schema makes brand-new tenant creation awkward because `clients.active_config_version_id` is required before the first config version exists

Mitigation:

- migration `006_self_serve_signup.sql` drops the `NOT NULL` constraint

### Partial tenant creation

Risk:

- a failed signup could leave orphaned rows

Mitigation:

- run the full signup inside one transaction

### Slug collisions and reserved tenants

Risk:

- new tenants could collide with seeded/demo tenants or existing public widget identifiers

Mitigation:

- normalize `clientId`
- reserve `demo`
- reject duplicates with `409`
- add `is_system_client`

### Portal architecture drift

Risk:

- implementation could accidentally introduce routed portal pages even though the current runtime is a single-shell app

Mitigation:

- keep signup as a shell mode switch only

### Billing coupling

Risk:

- signup could start assuming trialing/subscription behavior before billing exists

Mitigation:

- keep billing out of signup entirely
- create only tenant/auth/config/session state

### Abuse and spam signup

Risk:

- public signup is more abuse-prone than seeded admin provisioning

Mitigation:

- keep the first version minimal
- plan rate limiting and anti-automation as a follow-up milestone

## Files That Will Be Modified

### New files

- `apps/backend/db/migrations/006_self_serve_signup.sql`
- `apps/backend/src/application/registerPortalTenant.ts`
- `apps/backend/src/infrastructure/tenantSignupRepository.ts`

### Existing files

- `apps/backend/src/modules/auth.ts`
- `apps/backend/src/http/validation.ts`
- `apps/backend/src/application/errors.ts`
- `apps/backend/src/infrastructure/clientRepository.ts`
- `apps/backend/src/infrastructure/clientUserRepository.ts`
- `apps/backend/src/test/backendFlows.test.ts`
- `apps/portal-site/src/main.ts`
- `apps/portal-site/src/portalApi.ts`
- `apps/portal-site/src/portalTypes.ts`
- `apps/portal-site/src/styles.css`

## Deployment Order

Deploy in this order:

1. Apply `apps/backend/db/migrations/006_self_serve_signup.sql`
2. Deploy backend with `POST /auth/signup`
3. Deploy portal with the single-shell signup mode

Reasoning:

- the migration is backward-compatible and must exist before backend signup logic runs
- backend must be live before the portal starts calling the new endpoint
- portal should be deployed last so users do not see a signup UI before the backend supports it

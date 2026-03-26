# Backend Critical Flow Tests

This milestone adds deterministic backend-focused automated tests for the core production flows that now carry the most business and tenant-isolation risk.

## What Changed

- Added a backend integration test suite for auth login, logout, and `/auth/me`.
- Added protected-route coverage to ensure unauthenticated portal access is rejected.
- Added pricing config versioning coverage for unchanged saves and changed saves.
- Added lead capture coverage to confirm `config_version_id` is stored on each lead.
- Added tenant-isolation coverage for lead listing and client settings reads.
- Added a backend `npm test` command so the critical flows can run in CI or before deployment.

## Test Strategy

- Tests stay backend-first and exercise the real Express app rather than isolated helpers.
- The suite replays the real SQL migrations from `backend/db/migrations/` during setup.
- Each test starts from a clean deterministic database state and reseeded fixtures.
- Session auth behavior is exercised through real HTTP requests so cookie-based auth stays covered after the HttpOnly migration.

## Covered Flows

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- protected portal route rejection without authentication
- unchanged pricing config save does not create a new version
- changed pricing config save creates a new active version
- lead creation stores `config_version_id`
- tenant isolation for leads and client settings

## Verification

Run:

```powershell
cd backend
npm install
npm run build
npm test
```

Expected result:

- TypeScript build passes
- all backend critical-flow tests pass deterministically

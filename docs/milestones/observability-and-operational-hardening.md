# Observability And Operational Hardening

This milestone adds production-oriented backend diagnostics and structured runtime visibility without changing the existing product API contracts.

## What Changed

- Added structured JSON logging across backend runtime flows.
- Added request ID middleware and `X-Request-Id` response headers.
- Added request lifecycle logging for request start, request completion, status code, and duration.
- Added business event logging for portal login, lead creation, pricing config version creation/activation, and email delivery results.
- Added `/health`, `/health/db`, and `/health/email` operational endpoints.
- Centralized error logging inside the backend error handler.

## Logging Model

Structured log entries now include:

- `timestamp`
- `level`
- `event`
- `service`
- `environment`
- `requestId` when the event occurs inside a request context

Request logs now cover:

- request start
- request completion
- application-level handled errors
- unexpected unhandled errors

## Health Checks

- `GET /health` provides process liveness information.
- `GET /health/db` verifies PostgreSQL connectivity.
- `GET /health/email` verifies whether lead email delivery is configured.

Operational behavior:

- `/health/db` returns `503` when the database probe fails.
- `/health/email` returns `503` when required email configuration is missing.

## Business Events

Key logged events now include:

- `portal_login_succeeded`
- `lead_created`
- `config_version_created`
- `config_version_activated`
- `lead_notification_sent`
- `lead_notification_failed`

## Verification

Run:

```powershell
cd backend
npm install
npm run build
npm test
```

Expected result:

- backend TypeScript build passes
- existing backend critical-flow tests continue to pass

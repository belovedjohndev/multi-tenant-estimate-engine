# Billing Foundation

> Status: Planned. Use `docs/CURRENT_IMPLEMENTATION.md` for live runtime truth. This document defines the billing foundation that must be implemented before any Paddle-specific coding begins.

This milestone establishes the internal billing domain, schema, normalized subscription state, webhook idempotency rules, and portal/backend contracts for billing. It does not implement Paddle checkout yet.

## Summary

The current platform already supports:

- self-serve tenant signup
- portal login/logout with HttpOnly cookie-backed sessions
- tenant-scoped settings and lead management
- billing-free product usage

The platform does not yet support:

- an internal subscription source of truth
- billing checkout
- billing webhooks
- normalized subscription state
- entitlement checks

This milestone defines the billing foundation so the platform can add Paddle without allowing provider payloads to become the application domain model.

## Current State

Runtime truth for this milestone comes from [`docs/CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).

Relevant current runtime facts:

- `portal-site` is a single app shell
- portal auth already implements:
  - `POST /auth/login`
  - `POST /auth/signup`
  - `GET /auth/me`
  - `POST /auth/logout`
- backend billing is not implemented
- new tenants can sign up and use the product without subscription state
- the backend currently has no subscription tables, billing customer tables, or webhook event ledger

## Goals of This Milestone

- Define Postgres as the billing source of truth
- Define provider-agnostic internal billing entities
- Define the normalized subscription status model and allowed transitions
- Define the tenant access policy before and after billing enforcement
- Define the first backend billing API surface
- Define webhook processing and idempotency rules
- Define a minimal v1 schema that supports Paddle first and PayPal later
- Keep the portal single-shell architecture intact

## Non-Goals

This milestone does not implement:

- Paddle API integration
- PayPal integration
- invoice history
- taxes
- coupons/discounts
- seat billing
- multi-item subscriptions
- billing UI implementation
- entitlement enforcement rollout

## Billing Runtime Truth Boundary

These rules are mandatory for all billing implementation work:

1. Postgres is the billing source of truth.
2. Provider webhooks are inputs, not authoritative runtime state.
3. Provider IDs are foreign references, not primary business state.
4. Portal and backend entitlement checks must read normalized internal billing state only.
5. Portal UI must not depend directly on Paddle payload shapes.
6. Provider adapters belong in infrastructure, not application/domain logic.

## Tenant Access Policy

### Before Billing Enforcement Exists

Until the billing enforcement milestone is deployed, all tenants remain usable in the current billing-free mode.

This means newly signed-up tenants are allowed to:

- create an account
- access the portal
- manage company settings
- use the product in the current non-billed mode

### After Billing Enforcement Begins

The enforcement target for v1 is:

- existing already-live tenants remain functional until they are explicitly migrated to normalized billing state
- new tenants start in a normalized pre-subscription state of `pending`
- entitlements are determined from internal billing state, not portal-only checks

Target entitlement policy by normalized status:

- `pending`
  - portal access: yes
  - billing page access: yes
  - company settings access: yes
  - live widget usage: no
  - public estimate/lead capture for the tenant: no
- `incomplete`
  - same as `pending`
- `trialing`
  - full product access
- `active`
  - full product access
- `past_due`
  - portal access: yes
  - billing page access: yes
  - company settings access: yes
  - live widget usage: no
  - public estimate/lead capture for the tenant: no
- `canceled`
  - if `ended_at` is in the future or null and `current_period_ends_at` is still in the future, keep full product access until the effective end
  - once the subscription has ended, fall back to portal + billing access only
- `expired`
  - portal access: yes
  - billing page access: yes
  - company settings access: yes
  - live widget usage: no
  - public estimate/lead capture for the tenant: no

### Enforcement Rollout Rule

This milestone only defines the policy. It does not turn billing enforcement on.

## Internal Billing Domain Model

### Provider enum

- `paddle`
- `paypal`

### Subscription status enum

- `pending`
- `trialing`
- `active`
- `past_due`
- `canceled`
- `expired`
- `incomplete`

### Billing interval enum

- `month`
- `year`
- `manual`

### Internal plan codes

V1 plan identity is internal and interval-specific:

- `starter_monthly`
- `growth_monthly`
- `pro_monthly`
- `enterprise_manual`

Rules:

- plan code is the canonical business identifier
- provider product/price IDs map to plan code in infrastructure/config
- provider IDs must never become the canonical plan identity

### Valid state transitions

Allowed transitions for the normalized state machine:

- `pending -> trialing`
- `pending -> active`
- `pending -> incomplete`
- `incomplete -> active`
- `incomplete -> canceled`
- `trialing -> active`
- `trialing -> canceled`
- `active -> past_due`
- `active -> canceled`
- `past_due -> active`
- `past_due -> expired`
- `canceled -> expired`

For v1, implementation must reject or ignore transitions outside this list unless an explicit migration or design update adds them.

## Internal Source of Truth

The platform must determine billing and entitlement state from normalized data in Postgres.

Internal billing reads must answer:

- current normalized status
- current plan code
- provider and provider references
- trial boundaries if present
- current billing period boundaries
- cancel-at-period-end state
- derived entitlements

Do not determine access by calling Paddle during request handling.

## Minimal v1 Schema

Create:

- `apps/backend/db/migrations/007_billing_foundation.sql`

### `billing_customers`

Purpose:

- map a tenant to a provider customer record

Suggested shape:

```sql
CREATE TABLE billing_customers (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('paddle', 'paypal')),
    provider_customer_id TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, provider),
    UNIQUE (provider, provider_customer_id)
);
```

### `subscriptions`

Purpose:

- hold the canonical normalized subscription record for a tenant

Suggested shape:

```sql
CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    billing_customer_id BIGINT NOT NULL REFERENCES billing_customers(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL CHECK (provider IN ('paddle', 'paypal')),
    provider_subscription_id TEXT NOT NULL,
    plan_code TEXT NOT NULL CHECK (plan_code IN ('starter_monthly', 'growth_monthly', 'pro_monthly', 'enterprise_manual')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')),
    currency_code CHAR(3) NOT NULL,
    unit_amount_minor INTEGER NOT NULL CHECK (unit_amount_minor >= 0),
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year', 'manual')),
    current_period_starts_at TIMESTAMPTZ,
    current_period_ends_at TIMESTAMPTZ,
    trial_starts_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id),
    UNIQUE (provider, provider_subscription_id)
);
```

V1 rule:

- one canonical current subscription row per tenant
- history lives in the event ledger, not multiple current subscription rows

### `raw_billing_events`

Purpose:

- immutable durable ledger of received billing events
- debugging and replay support

Suggested shape:

```sql
CREATE TABLE raw_billing_events (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('paddle', 'paypal')),
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    signature TEXT,
    client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
    subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `processed_webhook_events`

Purpose:

- enforce idempotent webhook application

Suggested shape:

```sql
CREATE TABLE processed_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('paddle', 'paypal')),
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
    subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
    processing_result TEXT NOT NULL CHECK (processing_result IN ('applied', 'ignored')),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_event_id)
);
```

## Migration Plan

Create:

- `apps/backend/db/migrations/007_billing_foundation.sql`

This migration should:

1. create `billing_customers`
2. create `subscriptions`
3. create `raw_billing_events`
4. create `processed_webhook_events`
5. create supporting indexes for tenant and provider lookup

No billing data backfill is required in this first migration.

## Webhook Processing Rules

These rules are required before implementation:

1. verify the provider signature
2. store the raw payload first in `raw_billing_events`
3. process idempotently using `(provider, provider_event_id)`
4. normalize the event into internal subscription state
5. update subscription state transactionally
6. record the final processing outcome in `processed_webhook_events`
7. never apply the same webhook twice

Precedence rule:

- checkout initiation may create provider references
- webhook processing is the durable synchronization mechanism
- internal DB state remains authoritative after normalization

## Backend Application and Service Design

The first billing backend slice should add provider-agnostic application contracts before provider implementation details.

### Domain/application responsibilities

- `getPortalBillingSummary(clientId)`
- `startPortalCheckout(clientId, requestedPlanCode)`
- `cancelPortalSubscription(clientId)`
- `handlePaddleWebhook(rawRequest)`
- `deriveBillingEntitlements(status, planCode, periodState)`

### Infrastructure responsibilities

- Paddle API client
- Paddle checkout session creation
- Paddle webhook signature verification
- mapping provider payloads into normalized internal commands/events

## Backend API Surface for v1

### `GET /portal/billing`

Purpose:

- return the normalized billing read model for the current tenant

Suggested response shape:

```json
{
  "success": true,
  "data": {
    "clientId": "acme-home",
    "subscription": {
      "status": "pending",
      "planCode": null,
      "provider": null,
      "billingInterval": null,
      "currencyCode": null,
      "unitAmountMinor": null,
      "trialEndsAt": null,
      "currentPeriodEndsAt": null,
      "cancelAtPeriodEnd": false,
      "endedAt": null
    },
    "entitlements": {
      "portalAccess": true,
      "billingAccess": true,
      "settingsAccess": true,
      "liveUsage": false,
      "leadCapture": false,
      "widgetPublish": false
    },
    "actions": {
      "canStartCheckout": true,
      "canCancel": false,
      "canManage": false
    }
  }
}
```

### `POST /portal/billing/checkout`

Purpose:

- start a billing checkout flow for the current tenant

Suggested request:

```json
{
  "planCode": "starter_monthly"
}
```

Suggested response:

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://...",
    "provider": "paddle"
  }
}
```

### `POST /portal/billing/cancel`

Purpose:

- request cancel-at-period-end or cancellation for the current subscription

Suggested response:

```json
{
  "success": true,
  "data": {
    "status": "canceled",
    "cancelAtPeriodEnd": true,
    "currentPeriodEndsAt": "2026-06-01T00:00:00.000Z"
  }
}
```

### `POST /billing/webhooks/paddle`

Purpose:

- receive Paddle webhook events
- verify, persist, normalize, and apply them transactionally

This endpoint is public but must be signature-verified and idempotent.

## Portal Billing UX Contract

The portal must stay a single-shell app.

This milestone does not build the billing page, but it locks the backend contract the portal will need.

The portal billing surface must be able to render:

- current plan label
- normalized status
- billing period or trial end
- cancellation state
- subscribe/manage CTA state
- entitlement-limited feature messaging

The portal must consume the normalized billing read model rather than deriving billing logic locally.

## Test Plan

### Schema and repository tests

Add tests to verify:

- one tenant maps deterministically to one canonical subscription row
- provider/customer uniqueness constraints hold
- raw event storage accepts retries without uniqueness failure
- processed event ledger rejects duplicate `(provider, provider_event_id)` applications

### Application tests

Add tests to verify:

- billing summary returns `pending` when a tenant has no subscription row yet
- entitlements are derived from normalized internal status, not provider strings
- allowed status transitions apply successfully
- invalid status transitions are rejected or ignored deterministically

### Webhook tests

Add tests to verify:

- invalid signatures are rejected
- raw events are persisted before normalization
- duplicate webhook delivery is idempotent
- webhook application updates subscription state transactionally
- replayed events do not double-apply changes

### Portal contract tests

Add tests or smoke checks to verify:

- a newly signed-up tenant receives a billing summary in the `pending` state
- portal can render subscribe/manage CTA state from the read model
- billing read model remains provider-agnostic

## Acceptance Criteria

The billing foundation design is complete when:

- one tenant maps deterministically to billing customer and normalized subscription state
- plan identity is internal, not provider-native
- status transitions are explicitly documented
- webhook replay and idempotency behavior are specified
- pre-billing and post-billing tenant access rules are specified
- future PayPal support can be added without replacing core subscription tables
- a portal billing read model is defined before UI implementation begins

## Risks and Mitigations

### Provider-shaped schema

Risk:

- letting Paddle payloads or IDs define the domain model will make future PayPal support painful

Mitigation:

- keep provider IDs as references only
- keep plan/status/provider enums internal

### Ambiguous pre-subscription access

Risk:

- if `pending` and similar states are not defined now, entitlement rollout will become inconsistent

Mitigation:

- define target access policy before implementation

### Missing event ledger

Risk:

- webhook debugging and replay are fragile without durable raw-event storage and processed-event idempotency

Mitigation:

- require both `raw_billing_events` and `processed_webhook_events`

### Over-designing v1

Risk:

- billing v1 could grow into invoices, taxes, discounts, seats, or multi-item subscriptions before the core model is stable

Mitigation:

- keep v1 schema and API limited to customer, subscription, webhook ledger, and normalized billing summary

## Files That Will Be Modified In The First Implementation Slice

### New files

- `apps/backend/db/migrations/007_billing_foundation.sql`
- `apps/backend/src/application/getPortalBillingSummary.ts`
- `apps/backend/src/application/startPortalCheckout.ts`
- `apps/backend/src/application/cancelPortalSubscription.ts`
- `apps/backend/src/application/handlePaddleWebhook.ts`
- `apps/backend/src/infrastructure/billingRepository.ts`

### Existing files

- `apps/backend/src/modules/portal.ts`
- `apps/backend/src/index.ts`
- `apps/backend/src/application/errors.ts`
- `apps/backend/src/test/backendFlows.test.ts`
- `apps/portal-site/src/main.ts`
- `apps/portal-site/src/portalApi.ts`
- `apps/portal-site/src/portalTypes.ts`

## Delivery Order

Implement in this order:

1. create this billing foundation doc
2. add `007_billing_foundation.sql`
3. add backend billing read model for `GET /portal/billing`
4. add backend checkout and cancel contracts
5. add Paddle adapter and webhook processing
6. add portal billing UI on top of the normalized read model

Reasoning:

- schema must exist before billing read/write logic
- internal billing read model must exist before portal UI work
- provider integration must plug into the internal model, not define it

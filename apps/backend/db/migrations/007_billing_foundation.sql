-- Adds provider-agnostic billing foundation tables for normalized subscription state.

BEGIN;

CREATE TABLE billing_customers (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_customer_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT billing_customers_provider_chk CHECK (provider IN ('paddle', 'paypal')),
    CONSTRAINT billing_customers_client_provider_unique UNIQUE (client_id, provider),
    CONSTRAINT billing_customers_provider_customer_unique UNIQUE (provider, provider_customer_id)
);

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    billing_customer_id INTEGER NOT NULL REFERENCES billing_customers(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL,
    provider_subscription_id VARCHAR(255) NOT NULL,
    plan_code VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    unit_amount_minor INTEGER NOT NULL,
    billing_interval VARCHAR(50) NOT NULL,
    current_period_starts_at TIMESTAMP WITH TIME ZONE,
    current_period_ends_at TIMESTAMP WITH TIME ZONE,
    trial_starts_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subscriptions_provider_chk CHECK (provider IN ('paddle', 'paypal')),
    CONSTRAINT subscriptions_plan_code_chk CHECK (plan_code IN ('starter_monthly', 'growth_monthly', 'pro_monthly', 'enterprise_manual')),
    CONSTRAINT subscriptions_status_chk CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')),
    CONSTRAINT subscriptions_billing_interval_chk CHECK (billing_interval IN ('month', 'year', 'manual')),
    CONSTRAINT subscriptions_unit_amount_minor_chk CHECK (unit_amount_minor >= 0),
    CONSTRAINT subscriptions_client_unique UNIQUE (client_id),
    CONSTRAINT subscriptions_provider_subscription_unique UNIQUE (provider, provider_subscription_id)
);

CREATE TABLE raw_billing_events (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload_json JSONB NOT NULL,
    signature TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT raw_billing_events_provider_chk CHECK (provider IN ('paddle', 'paypal'))
);

CREATE TABLE processed_webhook_events (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    processing_result VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT processed_webhook_events_provider_chk CHECK (provider IN ('paddle', 'paypal')),
    CONSTRAINT processed_webhook_events_processing_result_chk CHECK (processing_result IN ('applied', 'ignored')),
    CONSTRAINT processed_webhook_events_provider_event_unique UNIQUE (provider, provider_event_id)
);

CREATE INDEX idx_billing_customers_client_id ON billing_customers(client_id);
CREATE INDEX idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_billing_customer_id ON subscriptions(billing_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_raw_billing_events_provider_received_at ON raw_billing_events(provider, received_at DESC);
CREATE INDEX idx_raw_billing_events_client_id ON raw_billing_events(client_id);
CREATE INDEX idx_processed_webhook_events_processed_at ON processed_webhook_events(processed_at DESC);
CREATE INDEX idx_processed_webhook_events_client_id ON processed_webhook_events(client_id);

COMMIT;

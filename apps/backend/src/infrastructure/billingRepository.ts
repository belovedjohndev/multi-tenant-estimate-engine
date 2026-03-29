import { BillingInterval, BillingSubscriptionStatus, SubscriptionSnapshot } from '../domain/billing';
import { pool } from './database';

interface SubscriptionRow {
    status: BillingSubscriptionStatus;
    plan_code: string;
    billing_interval: BillingInterval;
    currency_code: string;
    unit_amount_minor: number;
    current_period_starts_at: Date | null;
    current_period_ends_at: Date | null;
    cancel_at_period_end: boolean;
    canceled_at: Date | null;
    ended_at: Date | null;
}

export async function getCurrentSubscriptionSnapshotByClientId(clientId: number): Promise<SubscriptionSnapshot | null> {
    const result = await pool.query<SubscriptionRow>(
        `SELECT
             status,
             plan_code,
             billing_interval,
             currency_code,
             unit_amount_minor,
             current_period_starts_at,
             current_period_ends_at,
             cancel_at_period_end,
             canceled_at,
             ended_at
         FROM subscriptions
         WHERE client_id = $1`,
        [clientId]
    );

    const row = result.rows[0];

    if (!row) {
        return null;
    }

    return {
        status: row.status,
        planCode: row.plan_code,
        billingInterval: row.billing_interval,
        currencyCode: row.currency_code,
        unitAmountMinor: row.unit_amount_minor,
        currentPeriodStartsAt: row.current_period_starts_at,
        currentPeriodEndsAt: row.current_period_ends_at,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        canceledAt: row.canceled_at,
        endedAt: row.ended_at
    };
}

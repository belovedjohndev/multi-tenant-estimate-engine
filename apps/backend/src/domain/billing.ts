export type BillingEnforcementState = 'not_enforced' | 'enforced';

export type BillingProvider = 'paddle' | 'paypal';

export type BillingSubscriptionStatus = 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'incomplete';

export type BillingInterval = 'month' | 'year' | 'manual';

export interface SubscriptionSnapshot {
    status: BillingSubscriptionStatus | null;
    planCode: string | null;
    billingInterval: BillingInterval | null;
    currencyCode: string | null;
    unitAmountMinor: number | null;
    currentPeriodStartsAt: Date | null;
    currentPeriodEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    endedAt: Date | null;
}

export interface BillingEntitlements {
    portalAccess: boolean;
    widgetPublish: boolean;
    brandedExperience: boolean;
}

export interface PortalBillingSummary {
    enforcementState: BillingEnforcementState;
    subscription: {
        status: BillingSubscriptionStatus | null;
        planCode: string | null;
        billingInterval: BillingInterval | null;
        currencyCode: string | null;
        unitAmountMinor: number | null;
        currentPeriodStartsAt: string | null;
        currentPeriodEndsAt: string | null;
        cancelAtPeriodEnd: boolean;
        canceledAt: string | null;
        endedAt: string | null;
    };
    entitlements: BillingEntitlements;
}

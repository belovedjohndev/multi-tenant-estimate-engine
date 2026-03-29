import {
    BillingEnforcementState,
    BillingEntitlements,
    BillingSubscriptionStatus,
    PortalBillingSummary,
    SubscriptionSnapshot
} from '../domain/billing';
import { getCurrentSubscriptionSnapshotByClientId } from '../infrastructure/billingRepository';

export async function getPortalBillingSummary(clientId: number): Promise<PortalBillingSummary> {
    const enforcementState = getBillingEnforcementState();
    const subscriptionSnapshot = await getCurrentSubscriptionSnapshotByClientId(clientId);
    const normalizedSubscription = normalizeSubscriptionSnapshot(subscriptionSnapshot, enforcementState);

    return {
        enforcementState,
        subscription: {
            status: normalizedSubscription.status,
            planCode: normalizedSubscription.planCode,
            billingInterval: normalizedSubscription.billingInterval,
            currencyCode: normalizedSubscription.currencyCode,
            unitAmountMinor: normalizedSubscription.unitAmountMinor,
            currentPeriodStartsAt: normalizedSubscription.currentPeriodStartsAt?.toISOString() ?? null,
            currentPeriodEndsAt: normalizedSubscription.currentPeriodEndsAt?.toISOString() ?? null,
            cancelAtPeriodEnd: normalizedSubscription.cancelAtPeriodEnd,
            canceledAt: normalizedSubscription.canceledAt?.toISOString() ?? null,
            endedAt: normalizedSubscription.endedAt?.toISOString() ?? null
        },
        entitlements: deriveBillingEntitlements(enforcementState, normalizedSubscription)
    };
}

function normalizeSubscriptionSnapshot(
    subscriptionSnapshot: SubscriptionSnapshot | null,
    enforcementState: BillingEnforcementState
): SubscriptionSnapshot {
    if (subscriptionSnapshot) {
        return subscriptionSnapshot;
    }

    return {
        status: enforcementState === 'enforced' ? 'pending' : null,
        planCode: null,
        billingInterval: null,
        currencyCode: null,
        unitAmountMinor: null,
        currentPeriodStartsAt: null,
        currentPeriodEndsAt: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        endedAt: null
    };
}

function deriveBillingEntitlements(
    enforcementState: BillingEnforcementState,
    subscriptionSnapshot: SubscriptionSnapshot
): BillingEntitlements {
    if (enforcementState === 'not_enforced') {
        return {
            portalAccess: true,
            widgetPublish: true,
            brandedExperience: true
        };
    }

    if (subscriptionSnapshot.status === 'trialing' || subscriptionSnapshot.status === 'active') {
        return {
            portalAccess: true,
            widgetPublish: true,
            brandedExperience: true
        };
    }

    if (subscriptionSnapshot.status === 'canceled' && hasFutureOrUnsetEnd(subscriptionSnapshot)) {
        return {
            portalAccess: true,
            widgetPublish: true,
            brandedExperience: true
        };
    }

    return {
        portalAccess: true,
        widgetPublish: false,
        brandedExperience: true
    };
}

function hasFutureOrUnsetEnd(subscriptionSnapshot: SubscriptionSnapshot): boolean {
    if (!subscriptionSnapshot.currentPeriodEndsAt && !subscriptionSnapshot.endedAt) {
        return true;
    }

    const effectiveEnd = subscriptionSnapshot.endedAt ?? subscriptionSnapshot.currentPeriodEndsAt;

    return effectiveEnd !== null && effectiveEnd.getTime() > Date.now();
}

function getBillingEnforcementState(): BillingEnforcementState {
    const rawValue = process.env.CLIENT_BILLING_ENFORCEMENT?.trim().toLowerCase();

    if (!rawValue) {
        return 'not_enforced';
    }

    if (rawValue === 'true') {
        return 'enforced';
    }

    if (rawValue === 'false') {
        return 'not_enforced';
    }

    throw new Error('CLIENT_BILLING_ENFORCEMENT must be true or false when provided');
}

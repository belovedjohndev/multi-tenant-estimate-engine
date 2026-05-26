export interface PortalLoginResponse {
    expiresAt: string;
    user: {
        id: number;
        email: string;
        fullName: string;
    };
    client: {
        id: number;
        name: string;
    };
}

export interface PortalSession {
    user: {
        id: number;
        email: string;
        fullName: string;
        lastLoginAt?: string;
    };
    client: {
        id: number;
        name: string;
        branding: {
            logoUrl?: string;
            primaryColor?: string;
            secondaryColor?: string;
            fontFamily?: string;
        } | null;
    };
    session: {
        id: number;
        expiresAt: string;
        lastSeenAt: string;
    };
}

export interface PortalClientSettings {
    clientId: string;
    companyName: string;
    logoUrl?: string;
    phone?: string;
    notificationEmail?: string;
    currentConfigVersion: {
        id: number;
        versionNumber: number;
        createdAt: string;
    };
    configHistory: Array<{
        id: number;
        versionNumber: number;
        createdAt: string;
        isActive: boolean;
        createdByEmail?: string;
    }>;
    estimatorConfig: {
        basePrice: number;
        multipliers: {
            size: number;
            complexity: number;
        };
        discounts: {
            bulk: number;
        };
    };
}

export interface PortalLeadsResponse {
    summary: {
        totalLeadCount: number;
        averageEstimateTotal: number | null;
        latestLeadCreatedAt: string | null;
    };
    leads: Array<{
        id: number;
        name?: string;
        email: string;
        phone?: string;
        configVersionId: number;
        configVersionNumber: number;
        estimateInput?: {
            size?: number;
            complexity?: 'low' | 'medium' | 'high';
            bulk?: boolean;
        };
        estimateData: {
            total: number;
            breakdown: {
                basePrice: number;
                sizeMultiplier: number;
                complexityMultiplier: number;
                discount: number;
            };
        };
        createdAt: string;
    }>;
}

export type PortalBillingEnforcementState = 'not_enforced' | 'enforced';

export type PortalBillingSubscriptionStatus = 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'incomplete';

export type PortalBillingInterval = 'month' | 'year' | 'manual';

export type PortalBillingPlanCode = 'starter_monthly' | 'growth_monthly' | 'pro_monthly' | 'enterprise_manual';

export interface PortalCheckoutSession {
    provider: 'paddle' | 'paypal';
    planCode: PortalBillingPlanCode;
    checkoutUrl: string;
}

export interface PortalBillingSummary {
    enforcementState: PortalBillingEnforcementState;
    subscription: {
        status: PortalBillingSubscriptionStatus | null;
        planCode: PortalBillingPlanCode | null;
        billingInterval: PortalBillingInterval | null;
        currencyCode: string | null;
        unitAmountMinor: number | null;
        currentPeriodStartsAt: string | null;
        currentPeriodEndsAt: string | null;
        cancelAtPeriodEnd: boolean;
        canceledAt: string | null;
        endedAt: string | null;
    };
    entitlements: {
        portalAccess: boolean;
        widgetPublish: boolean;
        brandedExperience: boolean;
    };
}

export interface ApiErrorResponse {
    code: string;
    message: string;
    statusCode: number;
}

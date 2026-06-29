import { PortalBillingSummary } from '../portalTypes';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
});

export function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

export function formatBillingAmount(value: number | null, currencyCode: string | null): string {
    if (value === null || !currencyCode) {
        return 'Not set';
    }

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode
        }).format(value / 100);
    } catch {
        return `${currencyCode} ${(value / 100).toFixed(2)}`;
    }
}

export function formatDateTime(value: string): string {
    return dateTimeFormatter.format(new Date(value));
}

export function formatOptionalDateTime(value: string | null): string {
    return value ? formatDateTime(value) : 'Not set';
}

export function formatBooleanStatus(value: boolean): string {
    return value ? 'Yes' : 'No';
}

export function formatBillingEnforcementState(value: PortalBillingSummary['enforcementState']): string {
    return value === 'not_enforced' ? 'Not enforced' : 'Enforced';
}

export function formatBillingSubscriptionStatus(value: PortalBillingSummary['subscription']['status']): string {
    if (!value) {
        return 'No active subscription';
    }

    return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatBillingInterval(value: PortalBillingSummary['subscription']['billingInterval']): string {
    if (!value) {
        return 'Not set';
    }

    return value === 'manual' ? 'Manual' : value === 'month' ? 'Monthly' : 'Yearly';
}

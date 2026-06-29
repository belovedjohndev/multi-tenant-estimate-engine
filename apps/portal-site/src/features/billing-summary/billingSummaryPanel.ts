import { PortalState } from '../../portalState';
import {
    formatBillingAmount,
    formatBillingEnforcementState,
    formatBillingInterval,
    formatBillingSubscriptionStatus,
    formatBooleanStatus,
    formatOptionalDateTime
} from '../../shared/format';
import { escapeHtml } from '../../shared/html';

export function renderBillingSummaryPanel(portal: PortalState): string {
    const billingState = portal.billing;

    if (billingState.status === 'loading') {
        return `
            <section class="billing-panel">
                <div class="settings-panel__header">
                    <div>
                        <p class="card-label">Billing Summary</p>
                        <h3>Current billing status</h3>
                    </div>
                    <p class="surface-meta">Loading</p>
                </div>
                <p class="surface-copy">
                    Checking the current billing foundation summary. Self-serve checkout is not active in this MVP.
                </p>
                <div class="portal-loading">
                    <div class="portal-loading-bar"></div>
                </div>
            </section>
        `;
    }

    if (billingState.status === 'error') {
        return `
            <section class="billing-panel">
                <div class="settings-panel__header">
                    <div>
                        <p class="card-label">Billing Summary</p>
                        <h3>Current billing status</h3>
                    </div>
                    <button class="secondary-button" type="button" id="portal-refresh-billing-button">Refresh Billing</button>
                </div>
                <p class="portal-feedback portal-feedback--error">
                    ${escapeHtml(billingState.errorMessage || 'Unable to load billing details right now.')}
                </p>
                <p class="surface-copy">
                    Your dashboard access is still available. This only affects the read-only billing summary section.
                </p>
            </section>
        `;
    }

    if (!billingState.summary) {
        return `
            <section class="billing-panel">
                <div class="settings-panel__header">
                    <div>
                        <p class="card-label">Billing Summary</p>
                        <h3>Current billing status</h3>
                    </div>
                    <button class="secondary-button" type="button" id="portal-refresh-billing-button">Refresh Billing</button>
                </div>
                <p class="surface-copy">
                    Billing details are not available yet. Self-serve checkout is not active in this MVP.
                </p>
            </section>
        `;
    }

    const { enforcementState, subscription, entitlements } = billingState.summary;
    const hasActiveSubscriptionSnapshot = subscription.status !== null;
    const billingCopy = hasActiveSubscriptionSnapshot
        ? 'This read-only summary comes from the normalized billing foundation in your account. Self-serve checkout is not active in this MVP.'
        : enforcementState === 'not_enforced'
          ? 'No active subscription is recorded yet. Billing is not currently enforced, so your company can continue using the portal and current product features.'
          : 'No active subscription is recorded yet. Billing enforcement is represented in the backend foundation, but self-serve checkout is not active in this MVP.';

    return `
        <section class="billing-panel">
            <div class="settings-panel__header">
                <div>
                    <p class="card-label">Billing Summary</p>
                    <h3>Current billing status</h3>
                </div>
                <button class="secondary-button" type="button" id="portal-refresh-billing-button">Refresh Billing</button>
            </div>
            <p class="surface-copy">${escapeHtml(billingCopy)}</p>
            <div class="billing-summary-grid">
                ${renderBillingFact('Enforcement', formatBillingEnforcementState(enforcementState))}
                ${renderBillingFact('Subscription Status', formatBillingSubscriptionStatus(subscription.status))}
                ${renderBillingFact('Plan Code', subscription.planCode ?? 'No active subscription')}
                ${renderBillingFact('Billing Interval', formatBillingInterval(subscription.billingInterval))}
                ${renderBillingFact('Currency', subscription.currencyCode ?? 'Not set')}
                ${renderBillingFact('Amount', formatBillingAmount(subscription.unitAmountMinor, subscription.currencyCode))}
                ${renderBillingFact('Current Period Starts', formatOptionalDateTime(subscription.currentPeriodStartsAt))}
                ${renderBillingFact('Current Period Ends', formatOptionalDateTime(subscription.currentPeriodEndsAt))}
                ${renderBillingFact('Cancel At Period End', formatBooleanStatus(subscription.cancelAtPeriodEnd))}
                ${renderBillingFact('Canceled At', formatOptionalDateTime(subscription.canceledAt))}
                ${renderBillingFact('Ended At', formatOptionalDateTime(subscription.endedAt))}
            </div>
            <div class="settings-history">
                <div class="settings-history__header">
                    <p class="card-label">Entitlements</p>
                    <p class="surface-meta">Normalized read model</p>
                </div>
                <div class="billing-entitlement-list">
                    ${renderBillingEntitlement('Portal access', entitlements.portalAccess)}
                    ${renderBillingEntitlement('Widget publish', entitlements.widgetPublish)}
                    ${renderBillingEntitlement('Branded experience', entitlements.brandedExperience)}
                </div>
            </div>
        </section>
    `;
}

function renderBillingFact(label: string, value: string): string {
    return `
        <div class="billing-summary-card">
            <p class="metric-label">${escapeHtml(label)}</p>
            <p class="billing-summary-card__value">${escapeHtml(value)}</p>
        </div>
    `;
}

function renderBillingEntitlement(label: string, enabled: boolean): string {
    return `
        <div class="billing-entitlement">
            <span class="billing-entitlement__label">${escapeHtml(label)}</span>
            <span class="billing-entitlement__badge${enabled ? ' is-allowed' : ' is-limited'}">
                ${enabled ? 'Available' : 'Unavailable'}
            </span>
        </div>
    `;
}

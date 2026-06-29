import { PortalState } from '../../portalState';
import { escapeHtml } from '../../shared/html';

export function renderAccessStatusCard(portal: PortalState): string {
    const billingState = portal.billing;
    const statusMeta = billingState.status === 'loading' ? 'Checking' : 'Active';
    const errorMarkup =
        billingState.status === 'error' && billingState.errorMessage
            ? `<p class="access-status-card__note">${escapeHtml(billingState.errorMessage)}</p>`
            : '';

    return `
        <section class="access-status-card">
            <div>
                <p class="card-label">Access status</p>
                <h3>Active</h3>
            </div>
            <p class="surface-meta">${escapeHtml(statusMeta)}</p>
            <p class="surface-copy">
                Self-serve checkout is not active in this MVP.
            </p>
            ${errorMarkup}
        </section>
    `;
}

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

    return `
        <section class="billing-panel">
            <div class="settings-panel__header">
                <div>
                    <p class="card-label">Billing Summary</p>
                    <h3>Read-only billing foundation</h3>
                </div>
                <p class="surface-meta">Foundation only</p>
            </div>
            <p class="surface-copy">
                Access is active. Self-serve checkout is not active in this MVP.
            </p>
        </section>
    `;
}

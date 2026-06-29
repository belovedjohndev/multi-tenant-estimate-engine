import { renderLeadList } from '../features/leads/leadList';
import { PortalState } from '../portalState';
import { formatCurrency, formatDateTime } from '../shared/format';
import { escapeHtml } from '../shared/html';

export function renderLeadsPage(portal: PortalState): string {
    const { leads, errorMessage } = portal;

    if (!leads) {
        return `
            <section class="surface-card">
                <div class="portal-loading">
                    <p class="portal-loading-title">Please wait</p>
                    <p class="portal-loading-copy">Loading submitted estimate requests.</p>
                    <div class="portal-loading-bar"></div>
                </div>
            </section>
        `;
    }

    return `
        <section class="surface-card leads-screen">
            <div class="surface-header">
                <div>
                    <p class="card-label">Estimate Requests</p>
                    <h2>Submitted requests</h2>
                </div>
                <button class="secondary-button" type="button" id="portal-refresh-button">Refresh</button>
            </div>
            <p class="surface-copy">
                Review tenant-scoped leads submitted from the estimator experience. Each request keeps the config version used at submission.
            </p>
            ${errorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(errorMessage)}</p>` : ''}
            <div class="metric-grid">
                ${renderMetricCard('Total Requests', String(leads.summary.totalLeadCount))}
                ${renderMetricCard(
                    'Average Estimate',
                    leads.summary.averageEstimateTotal === null ? 'No data' : formatCurrency(leads.summary.averageEstimateTotal)
                )}
                ${renderMetricCard(
                    'Latest Request',
                    leads.summary.latestLeadCreatedAt ? formatDateTime(leads.summary.latestLeadCreatedAt) : 'No requests yet'
                )}
            </div>
            ${renderLeadList(leads)}
        </section>
    `;
}

function renderMetricCard(label: string, value: string): string {
    return `
        <div class="metric-card">
            <p class="metric-label">${escapeHtml(label)}</p>
            <p class="metric-value">${escapeHtml(value)}</p>
        </div>
    `;
}

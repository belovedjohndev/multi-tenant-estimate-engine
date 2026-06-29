import { renderBillingSummaryPanel } from '../features/billing-summary/billingSummaryPanel';
import { renderDemoResetButton } from '../features/demo-reset/demoResetPanel';
import { renderLeadList } from '../features/leads/leadList';
import { PortalState } from '../portalState';
import { formatCurrency, formatDateTime } from '../shared/format';
import { escapeHtml } from '../shared/html';

export function renderDashboardPage(portal: PortalState): string {
    const { session, leads, settings, errorMessage } = portal;

    if (!session || !leads || !settings) {
        return renderProtectedLoading();
    }

    return `
        <section class="dashboard-screen">
            <div class="surface-card dashboard-card">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Company Dashboard</p>
                        <h2>${escapeHtml(settings.companyName)}</h2>
                    </div>
                    <div class="portal-actions">
                        <button class="secondary-button" type="button" id="portal-refresh-button">Refresh</button>
                        ${renderDemoResetButton(portal)}
                    </div>
                </div>
                <p class="surface-copy">
                    Signed in as <strong>${escapeHtml(session.user.fullName)}</strong> (${escapeHtml(session.user.email)}).
                    Login session ends ${escapeHtml(formatDateTime(session.session.expiresAt))}.
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
                ${renderBillingSummaryPanel(portal)}
            </div>
            <div class="surface-card lead-column">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Estimate Requests</p>
                        <h2>Recent requests</h2>
                    </div>
                    <a class="secondary-button" href="/leads">View All</a>
                </div>
                ${renderLeadList({
                    summary: leads.summary,
                    leads: leads.leads.slice(0, 5)
                })}
            </div>
        </section>
    `;
}

function renderProtectedLoading(): string {
    return `
        <section class="surface-card">
            <div class="portal-loading">
                <p class="portal-loading-title">Please wait</p>
                <p class="portal-loading-copy">Loading your dashboard and recent requests.</p>
                <div class="portal-loading-bar"></div>
            </div>
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

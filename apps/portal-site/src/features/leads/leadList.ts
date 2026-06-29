import { PortalLeadsResponse } from '../../portalTypes';
import { formatCurrency, formatDateTime } from '../../shared/format';
import { escapeHtml } from '../../shared/html';

export function renderLeadList(leads: PortalLeadsResponse): string {
    return `
        <div class="lead-list">
            ${leads.leads.length ? leads.leads.map(renderLeadCard).join('') : renderEmptyLeads()}
        </div>
    `;
}

function renderLeadCard(lead: PortalLeadsResponse['leads'][number]): string {
    return `
        <article class="lead-card">
            <div class="lead-card__row">
                <div>
                    <p class="lead-title">${escapeHtml(lead.name || 'Estimate request')}</p>
                    <p class="lead-subtitle">${escapeHtml(lead.email)}${lead.phone ? ` | ${escapeHtml(lead.phone)}` : ''}</p>
                </div>
                <p class="lead-total">${escapeHtml(formatCurrency(lead.estimateData.total))}</p>
            </div>
            <div class="lead-badges">
                ${renderLeadBadge('Submitted', formatDateTime(lead.createdAt))}
                ${renderLeadBadge(
                    'Complexity',
                    lead.estimateInput?.complexity ? lead.estimateInput.complexity.toUpperCase() : 'N/A'
                )}
                ${renderLeadBadge('Saved version', `v${lead.configVersionNumber}`)}
                ${renderLeadBadge('Project size', lead.estimateInput?.size !== undefined ? String(lead.estimateInput.size) : 'N/A')}
                ${renderLeadBadge('Bulk pricing', lead.estimateInput?.bulk === true ? 'Yes' : lead.estimateInput?.bulk === false ? 'No' : 'N/A')}
            </div>
        </article>
    `;
}

function renderLeadBadge(label: string, value: string): string {
    return `<span class="lead-badge"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`;
}

function renderEmptyLeads(): string {
    return `
        <div class="empty-state">
            <p class="empty-state__title">No estimate requests yet.</p>
            <p class="empty-state__copy">
                Submitted requests from the public estimator will appear here.
            </p>
        </div>
    `;
}

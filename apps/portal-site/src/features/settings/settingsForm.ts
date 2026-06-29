import { PortalState } from '../../portalState';
import { PortalClientSettings } from '../../portalTypes';
import { formatDateTime } from '../../shared/format';
import { escapeHtml } from '../../shared/html';

export function renderSettingsForm(settings: PortalClientSettings, portal: PortalState): string {
    const estimatorConfigJson = JSON.stringify(settings.estimatorConfig, null, 2);
    const historyMarkup = settings.configHistory.length
        ? settings.configHistory
              .map(
                  (entry) => `
                    <li class="history-item">
                        <span class="history-item__version">${escapeHtml(`v${entry.versionNumber}`)}</span>
                        <span class="history-item__meta">${escapeHtml(formatDateTime(entry.createdAt))}${
                            entry.createdByEmail ? ` by ${escapeHtml(entry.createdByEmail)}` : ''
                        }</span>
                        ${entry.isActive ? '<span class="history-item__active">Current</span>' : ''}
                    </li>
                `
              )
              .join('')
        : '<li class="history-item">No saved changes yet.</li>';

    return `
        <section class="settings-panel">
            <div class="settings-panel__header">
                <div>
                    <p class="card-label">Company Settings</p>
                    <h3>Profile, pricing, and change history</h3>
                </div>
                <p class="surface-meta">Company ID: ${escapeHtml(settings.clientId)}</p>
            </div>
            <p class="surface-copy">
                Update your company details and pricing settings here while keeping the same company ID for your website.
            </p>
            <div class="settings-version-card">
                <p class="metric-label">Current Saved Version</p>
                <p class="settings-version-card__value">v${escapeHtml(String(settings.currentConfigVersion.versionNumber))}</p>
                <p class="settings-version-card__meta">Saved ${escapeHtml(formatDateTime(settings.currentConfigVersion.createdAt))}</p>
            </div>
            ${portal.settingsMessage ? `<p class="portal-feedback portal-feedback--success">${escapeHtml(portal.settingsMessage)}</p>` : ''}
            <form id="portal-settings-form" class="portal-form">
                <div class="settings-grid">
                    <label class="field">
                        <span class="field-label">Company Name</span>
                        <input class="field-input" name="companyName" type="text" value="${escapeHtml(settings.companyName)}" />
                    </label>
                    <label class="field">
                        <span class="field-label">Notification Email</span>
                        <input class="field-input" name="notificationEmail" type="email" value="${escapeHtml(settings.notificationEmail || '')}" />
                    </label>
                    <label class="field">
                        <span class="field-label">Phone</span>
                        <input class="field-input" name="phone" type="text" value="${escapeHtml(settings.phone || '')}" />
                    </label>
                    <label class="field">
                        <span class="field-label">Logo URL</span>
                        <input class="field-input" name="logoUrl" type="url" value="${escapeHtml(settings.logoUrl || '')}" />
                    </label>
                </div>
                <label class="field">
                    <span class="field-label">Pricing Settings</span>
                    <textarea class="field-input field-input--multiline" name="estimatorConfig">${escapeHtml(estimatorConfigJson)}</textarea>
                </label>
                <button class="primary-button" type="submit">${portal.isSavingSettings ? 'Saving...' : 'Save Changes'}</button>
            </form>
            <div class="settings-history">
                <div class="settings-history__header">
                    <p class="card-label">Pricing Change History</p>
                    <p class="surface-meta">Saved versions</p>
                </div>
                <ul class="history-list">
                    ${historyMarkup}
                </ul>
            </div>
        </section>
    `;
}

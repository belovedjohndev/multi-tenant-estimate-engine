import { renderSettingsForm } from '../features/settings/settingsForm';
import { PortalState } from '../portalState';
import { escapeHtml } from '../shared/html';

export function renderSettingsPage(portal: PortalState): string {
    const { settings, errorMessage } = portal;

    if (!settings) {
        return `
            <section class="surface-card">
                <div class="portal-loading">
                    <p class="portal-loading-title">Please wait</p>
                    <p class="portal-loading-copy">Loading company settings.</p>
                    <div class="portal-loading-bar"></div>
                </div>
            </section>
        `;
    }

    return `
        <section class="settings-screen">
            ${errorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(errorMessage)}</p>` : ''}
            ${renderSettingsForm(settings, portal)}
        </section>
    `;
}

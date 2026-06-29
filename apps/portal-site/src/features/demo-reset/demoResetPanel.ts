import { portalConfig } from '../../portalConfig';
import { PortalState } from '../../portalState';
import { PortalSession } from '../../portalTypes';

export function isDemoResetAvailable(session: PortalSession | null): boolean {
    return Boolean(session && session.client.name === portalConfig.defaultClientId);
}

export function renderDemoResetButton(portal: PortalState): string {
    if (!isDemoResetAvailable(portal.session)) {
        return '';
    }

    return `<button class="secondary-button secondary-button--danger" type="button" id="portal-reset-demo-button" ${
        portal.isResettingDemo ? 'disabled' : ''
    }>${portal.isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}</button>`;
}

export function renderResetDialog(portal: PortalState): string {
    if (!portal.isResetDialogOpen) {
        return '';
    }

    return `
        <div class="portal-dialog-backdrop" id="portal-reset-dialog-backdrop">
            <section class="portal-dialog" role="dialog" aria-modal="true" aria-labelledby="portal-reset-dialog-title">
                <p class="card-label">Reset Demo Data</p>
                <h2 id="portal-reset-dialog-title">Start fresh for the next walkthrough?</h2>
                <p class="surface-copy">
                    This clears recent requests and restores the shared demo company settings so the dashboard is ready for the next client review.
                </p>
                <div class="portal-dialog__actions">
                    <button class="secondary-button" type="button" id="portal-reset-dialog-cancel" ${
                        portal.isResettingDemo ? 'disabled' : ''
                    }>Keep Current Data</button>
                    <button class="primary-button secondary-button--danger-solid" type="button" id="portal-reset-dialog-confirm" ${
                        portal.isResettingDemo ? 'disabled' : ''
                    }>
                        ${portal.isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}
                    </button>
                </div>
            </section>
        </div>
    `;
}

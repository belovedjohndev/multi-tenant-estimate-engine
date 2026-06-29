import { PortalState } from '../portalState';
import { renderLoginForm, renderPortalLoading } from '../features/auth/authForms';
import { escapeHtml } from '../shared/html';

export function renderLoginPage(portal: PortalState): string {
    return `
        <section class="portal-surface">
            <div class="surface-card surface-card--auth">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Secure Sign-In</p>
                        <h2>Sign in to Estimate Engine</h2>
                    </div>
                    <p class="surface-meta surface-meta--compact">Private access</p>
                </div>
                <p class="surface-copy">
                    Sign in to review customer requests, update pricing settings, and manage your company details.
                </p>
                <div class="auth-mode-switch" role="tablist" aria-label="Authentication mode">
                    <a class="auth-mode-button is-active" href="/login" aria-current="page">Sign In</a>
                    <a class="auth-mode-button" href="/signup">Create Account</a>
                </div>
                ${portal.errorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(portal.errorMessage)}</p>` : ''}
                ${portal.status === 'loading' || portal.status === 'signingIn' ? renderPortalLoading(portal.status) : renderLoginForm(portal)}
            </div>
            ${renderDashboardPreview()}
        </section>
    `;
}

function renderDashboardPreview(): string {
    return `
        <div class="surface-card surface-card--notes">
            <div class="surface-header">
                <div>
                    <p class="card-label">Dashboard Preview</p>
                    <h2>Today's estimate activity</h2>
                </div>
            </div>
            <div class="activity-preview-list" aria-label="Example estimate activity">
                <div class="activity-preview-row">
                    <div>
                        <h3>Sarah Mitchell</h3>
                        <p>System replacement estimate</p>
                    </div>
                    <strong>$4,850</strong>
                    <span class="status-pill status-pill--new">New</span>
                </div>
                <div class="activity-preview-row">
                    <div>
                        <h3>James Carter</h3>
                        <p>High-efficiency upgrade</p>
                    </div>
                    <strong>$6,200</strong>
                    <span class="status-pill status-pill--info">Needs review</span>
                </div>
                <div class="activity-preview-row">
                    <div>
                        <h3>Maria Lopez</h3>
                        <p>Service estimate request</p>
                    </div>
                    <strong>$1,950</strong>
                    <span class="status-pill status-pill--follow-up">Follow up</span>
                </div>
            </div>
            <div class="settings-preview">
                <p class="card-label">Estimator settings</p>
                <dl>
                    <div>
                        <dt>Base price</dt>
                        <dd>$100</dd>
                    </div>
                    <div>
                        <dt>Size multiplier</dt>
                        <dd>1.5x</dd>
                    </div>
                    <div>
                        <dt>Config version</dt>
                        <dd>Active</dd>
                    </div>
                </dl>
            </div>
        </div>
    `;
}

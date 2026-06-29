import { PortalState } from '../portalState';
import { renderPortalLoading, renderSignupForm } from '../features/auth/authForms';
import { escapeHtml } from '../shared/html';

export function renderSignupPage(portal: PortalState): string {
    return `
        <section class="portal-surface">
            <div class="surface-card surface-card--auth">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Create Account</p>
                        <h2>Create your company account</h2>
                    </div>
                    <p class="surface-meta surface-meta--compact">New account</p>
                </div>
                <p class="surface-copy">
                    Create your account to launch a new company dashboard with your own company ID, pricing settings, and branded portal access.
                </p>
                <div class="auth-mode-switch" role="tablist" aria-label="Authentication mode">
                    <a class="auth-mode-button" href="/login">Sign In</a>
                    <a class="auth-mode-button is-active" href="/signup" aria-current="page">Create Account</a>
                </div>
                ${portal.errorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(portal.errorMessage)}</p>` : ''}
                ${portal.status === 'loading' || portal.status === 'signingUp' ? renderPortalLoading(portal.status) : renderSignupForm(portal)}
            </div>
            <div class="surface-card surface-card--notes">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Private Portal</p>
                        <h2>Set up your estimator workspace</h2>
                    </div>
                </div>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>Company profile</h3>
                        <p>Use your own company ID, public contact details, and brand settings.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Estimator configuration</h3>
                        <p>Manage pricing inputs and keep saved config versions for submitted requests.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Lead review</h3>
                        <p>Review submitted estimate requests inside your authenticated tenant workspace.</p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

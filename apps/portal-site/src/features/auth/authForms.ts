import { portalConfig } from '../../portalConfig';
import { DemoAccessField, PortalState } from '../../portalState';
import { escapeHtml } from '../../shared/html';

export function renderPortalLoading(status: PortalState['status']): string {
    const copy =
        status === 'signingIn'
            ? 'Checking your details and opening your dashboard.'
            : status === 'signingUp'
              ? 'Creating your company account and preparing your dashboard.'
              : 'Loading your dashboard and recent requests.';

    return `
        <div class="portal-loading">
            <p class="portal-loading-title">Please wait</p>
            <p class="portal-loading-copy">${escapeHtml(copy)}</p>
            <div class="portal-loading-bar"></div>
        </div>
    `;
}

export function renderLoginForm(portal: PortalState): string {
    const { clientId, email, password, showPassword } = portal.loginForm;
    const demoAccess = portalConfig.demoAccess;

    return `
        <form id="portal-login-form" class="portal-form">
            <label class="field">
                <span class="field-label">Company ID</span>
                <input
                    class="field-input"
                    name="clientId"
                    type="text"
                    value="${escapeHtml(clientId)}"
                    autocomplete="organization"
                />
            </label>
            <label class="field">
                <span class="field-label">Email</span>
                <input
                    class="field-input"
                    name="email"
                    type="email"
                    value="${escapeHtml(email)}"
                    placeholder="owner@example.com"
                    autocomplete="email"
                />
            </label>
            <label class="field">
                <span class="field-label">Password</span>
                <input
                    class="field-input"
                    id="portal-password-input"
                    name="password"
                    type="${showPassword ? 'text' : 'password'}"
                    value="${escapeHtml(password)}"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                />
            </label>
            <label class="password-toggle" for="portal-password-toggle">
                <input
                    id="portal-password-toggle"
                    type="checkbox"
                    ${showPassword ? 'checked' : ''}
                />
                <span>Show password</span>
            </label>
            <button class="primary-button" type="submit">Sign In</button>
        </form>
        <div class="demo-access-card">
            <div class="demo-access-card__header">
                <div>
                    <p class="card-label">Demo Access</p>
                    <h3>Demo credentials</h3>
                </div>
                <button class="secondary-button demo-access-card__action" type="button" id="portal-fill-demo-button">
                    Autofill
                </button>
            </div>
            <p class="surface-copy demo-access-card__copy">
                Use the shared demo account for product walkthroughs.
            </p>
            <div class="demo-access-list">
                ${renderDemoAccessItem('Company ID', portalConfig.defaultClientId, 'clientId')}
                ${renderDemoAccessItem('Email', demoAccess.email, 'email')}
                ${renderDemoAccessItem('Password', demoAccess.password, 'password')}
            </div>
        </div>
    `;
}

export function renderSignupForm(portal: PortalState): string {
    const { companyName, clientId, fullName, email, phone, password, confirmPassword, showPassword } = portal.signupForm;

    return `
        <form id="portal-signup-form" class="portal-form">
            <div class="settings-grid">
                <label class="field">
                    <span class="field-label">Company Name</span>
                    <input
                        class="field-input"
                        name="companyName"
                        type="text"
                        value="${escapeHtml(companyName)}"
                        placeholder="ACME Home Services"
                        autocomplete="organization"
                    />
                </label>
                <label class="field">
                    <span class="field-label">Company ID</span>
                    <input
                        class="field-input"
                        name="clientId"
                        type="text"
                        value="${escapeHtml(clientId)}"
                        placeholder="acme-home"
                        autocomplete="off"
                    />
                    <span class="field-hint">Used as your permanent company ID for sign-in and estimator setup.</span>
                </label>
                <label class="field">
                    <span class="field-label">Full Name</span>
                    <input
                        class="field-input"
                        name="fullName"
                        type="text"
                        value="${escapeHtml(fullName)}"
                        placeholder="John D. Owner"
                        autocomplete="name"
                    />
                </label>
                <label class="field">
                    <span class="field-label">Phone</span>
                    <input
                        class="field-input"
                        name="phone"
                        type="text"
                        value="${escapeHtml(phone)}"
                        placeholder="Optional"
                        autocomplete="tel"
                    />
                </label>
                <label class="field">
                    <span class="field-label">Email</span>
                    <input
                        class="field-input"
                        name="email"
                        type="email"
                        value="${escapeHtml(email)}"
                        placeholder="owner@example.com"
                        autocomplete="email"
                    />
                </label>
                <label class="field">
                    <span class="field-label">Password</span>
                    <input
                        class="field-input"
                        id="portal-signup-password-input"
                        name="password"
                        type="${showPassword ? 'text' : 'password'}"
                        value="${escapeHtml(password)}"
                        placeholder="Create a password"
                        autocomplete="new-password"
                    />
                </label>
                <label class="field">
                    <span class="field-label">Confirm Password</span>
                    <input
                        class="field-input"
                        name="confirmPassword"
                        type="${showPassword ? 'text' : 'password'}"
                        value="${escapeHtml(confirmPassword)}"
                        placeholder="Repeat password"
                        autocomplete="new-password"
                    />
                </label>
            </div>
            <label class="password-toggle" for="portal-signup-password-toggle">
                <input
                    id="portal-signup-password-toggle"
                    type="checkbox"
                    ${showPassword ? 'checked' : ''}
                />
                <span>Show passwords</span>
            </label>
            <button class="primary-button" type="submit">Create Account</button>
        </form>
    `;
}

function renderDemoAccessItem(label: string, value: string, field: DemoAccessField): string {
    return `
        <div class="demo-access-item">
            <span class="demo-access-item__label">${escapeHtml(label)}</span>
            <code class="demo-access-item__value">${escapeHtml(value)}</code>
            <button
                class="secondary-button demo-access-item__copy"
                type="button"
                data-demo-copy-field="${field}"
            >
                Copy
            </button>
        </div>
    `;
}

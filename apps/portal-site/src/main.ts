import { portalConfig } from './portalConfig';
import {
    fetchPortalClientSettings,
    fetchPortalLeads,
    fetchPortalSession,
    loginPortal,
    logoutPortal,
    resetPortalDemo,
    signupPortal,
    updatePortalClientSettings
} from './portalApi';
import { PortalClientSettings, PortalLeadsResponse, PortalSession } from './portalTypes';
import './styles.css';

type PortalStatus = 'signedOut' | 'loading' | 'signingIn' | 'signingUp' | 'ready' | 'error';
type AuthMode = 'login' | 'signup';
type DemoAccessField = 'clientId' | 'email' | 'password';

interface AppState {
    portal: {
        status: PortalStatus;
        authMode: AuthMode;
        session: PortalSession | null;
        leads: PortalLeadsResponse | null;
        settings: PortalClientSettings | null;
        errorMessage: string | null;
        settingsMessage: string | null;
        isSavingSettings: boolean;
        isResettingDemo: boolean;
        isResetDialogOpen: boolean;
        loginForm: {
            clientId: string;
            email: string;
            password: string;
            showPassword: boolean;
        };
        signupForm: {
            companyName: string;
            clientId: string;
            fullName: string;
            email: string;
            phone: string;
            password: string;
            confirmPassword: string;
            showPassword: boolean;
        };
    };
}

const appRoot = document.getElementById('app-root');

if (!(appRoot instanceof HTMLElement)) {
    throw new Error('App root element #app-root was not found');
}

const rootElement: HTMLElement = appRoot;
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
});
const portalTitle = normalizePortalTitle(portalConfig.portalTitle);

const state: AppState = {
    portal: {
        status: 'loading',
        authMode: 'login',
        session: null,
        leads: null,
        settings: null,
        errorMessage: null,
        settingsMessage: null,
        isSavingSettings: false,
        isResettingDemo: false,
        isResetDialogOpen: false,
        loginForm: {
            clientId: portalConfig.defaultClientId,
            email: '',
            password: '',
            showPassword: false
        },
        signupForm: createInitialSignupForm()
    }
};

renderApp();
void hydratePortalSession();

async function hydratePortalSession() {
    await loadPortalDashboard({ suppressErrorOnUnauthorized: true });
}

async function loadPortalDashboard(options?: { suppressErrorOnUnauthorized?: boolean }) {
    state.portal.status = 'loading';
    state.portal.errorMessage = null;
    renderApp();

    try {
        const [session, leads, settings] = await Promise.all([
            fetchPortalSession(),
            fetchPortalLeads(),
            fetchPortalClientSettings()
        ]);

        state.portal = {
            status: 'ready',
            authMode: state.portal.authMode,
            session,
            leads,
            settings,
            errorMessage: null,
            settingsMessage: null,
            isSavingSettings: false,
            isResettingDemo: false,
            isResetDialogOpen: false,
            loginForm: {
                ...state.portal.loginForm,
                password: '',
                showPassword: false
            },
            signupForm: createInitialSignupForm({
                clientId: state.portal.signupForm.clientId,
                email: state.portal.signupForm.email
            })
        };
    } catch (error) {
        const statusCode = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: unknown }).statusCode) : null;
        const isUnauthorized = statusCode === 401;

        state.portal = {
            status: isUnauthorized && options?.suppressErrorOnUnauthorized ? 'signedOut' : 'error',
            authMode: state.portal.authMode,
            session: null,
            leads: null,
            settings: null,
            errorMessage:
                isUnauthorized && options?.suppressErrorOnUnauthorized
                    ? null
                    : getErrorMessage(error, 'Unable to load your dashboard.'),
            settingsMessage: null,
            isSavingSettings: false,
            isResettingDemo: false,
            isResetDialogOpen: false,
            loginForm: {
                ...state.portal.loginForm,
                password: '',
                showPassword: false
            },
            signupForm: {
                ...state.portal.signupForm,
                password: '',
                confirmPassword: '',
                showPassword: false
            }
        };
    }

    renderApp();
}

function renderApp() {
    rootElement.innerHTML = `
        <div class="portal-shell">
            <section class="portal-hero">
                <div class="portal-hero__copy">
                    <p class="eyebrow">Private Dashboard</p>
                    <h1>${escapeHtml(portalTitle)}</h1>
                    <p class="hero-copy">
                        Secure sign-in gives your team one place to review estimate requests, update pricing settings,
                        and manage company details while the public estimate experience stays separate.
                    </p>
                </div>
                <div class="portal-hero__meta">
                    <span class="hero-pill">Secure dashboard</span>
                    <span class="hero-pill">Company settings</span>
                    <span class="hero-pill">Secure sign-in</span>
                </div>
            </section>
            ${renderPortalSurface()}
        </div>
        ${renderResetDialog()}
    `;

    wirePortalEvents();
    applyPortalBranding();
}

function renderPortalSurface(): string {
    const { status, session, leads, settings, errorMessage, authMode } = state.portal;
    const isSignupMode = authMode === 'signup';

    if (status === 'ready' && session && leads && settings) {
        return renderDashboard(session, leads, settings);
    }

    return `
        <section class="portal-surface">
            <div class="surface-card surface-card--auth">
                <div class="surface-header">
                    <div>
                        <p class="card-label">${isSignupMode ? 'Create Account' : 'Secure Sign-In'}</p>
                        <h2>${isSignupMode ? 'Create your company account' : 'Access the private dashboard'}</h2>
                    </div>
                    <p class="surface-meta surface-meta--compact">${isSignupMode ? 'New account' : 'Private access'}</p>
                </div>
                <p class="surface-copy">
                    ${
                        isSignupMode
                            ? 'Create your account to launch a new company dashboard with your own company ID, pricing settings, and branded portal access.'
                            : 'Sign in to review customer requests, update pricing settings, and manage your company details.'
                    }
                </p>
                ${errorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(errorMessage)}</p>` : ''}
                ${
                    status === 'loading' || status === 'signingIn' || status === 'signingUp'
                        ? renderPortalLoading(status)
                        : isSignupMode
                          ? renderSignupForm()
                          : renderLoginForm()
                }
            </div>
            <div class="surface-card surface-card--notes">
                <div class="surface-header">
                    <div>
                        <p class="card-label">What You Can Manage</p>
                        <h2>Everything for your company stays here</h2>
                    </div>
                </div>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>Requests</h3>
                        <p>Review new estimate requests, totals, and recent activity in one private place.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Company details</h3>
                        <p>Keep your company name, notification email, phone number, and logo up to date.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Pricing settings</h3>
                        <p>Your pricing settings and saved changes stay linked to your company account.</p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderPortalLoading(status: PortalStatus): string {
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

function renderLoginForm(): string {
    const { clientId, email, password, showPassword } = state.portal.loginForm;
    const demoAccess = portalConfig.demoAccess;

    return `
        ${renderAuthModeSwitch()}
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
                    <h3>Testing credentials</h3>
                </div>
                <button class="secondary-button demo-access-card__action" type="button" id="portal-fill-demo-button">
                    Use Demo Access
                </button>
            </div>
            <p class="surface-copy demo-access-card__copy">
                Autofill the shared demo account or copy an individual value below for testing.
            </p>
            <div class="demo-access-list">
                ${renderDemoAccessItem('Company ID', portalConfig.defaultClientId, 'clientId')}
                ${renderDemoAccessItem('Email', demoAccess.email, 'email')}
                ${renderDemoAccessItem('Password', demoAccess.password, 'password')}
            </div>
        </div>
    `;
}

function renderSignupForm(): string {
    const { companyName, clientId, fullName, email, phone, password, confirmPassword, showPassword } = state.portal.signupForm;

    return `
        ${renderAuthModeSwitch()}
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
                        placeholder="Re-enter your password"
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
                <span>Show password fields</span>
            </label>
            <button class="primary-button" type="submit">Create Account</button>
        </form>
    `;
}

function renderAuthModeSwitch(): string {
    return `
        <div class="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
                class="auth-mode-button${state.portal.authMode === 'login' ? ' is-active' : ''}"
                id="portal-auth-mode-login"
                type="button"
            >
                Sign In
            </button>
            <button
                class="auth-mode-button${state.portal.authMode === 'signup' ? ' is-active' : ''}"
                id="portal-auth-mode-signup"
                type="button"
            >
                Create Account
            </button>
        </div>
    `;
}

function renderDashboard(session: PortalSession, leads: PortalLeadsResponse, settings: PortalClientSettings): string {
    const errorMessage = state.portal.errorMessage;
    const demoResetAvailable = isDemoResetAvailable(session);

    return `
        <section class="dashboard-shell">
            <div class="surface-card dashboard-card">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Company Dashboard</p>
                        <h2>${escapeHtml(settings.companyName)}</h2>
                    </div>
                    <div class="portal-actions">
                        <button class="secondary-button" type="button" id="portal-refresh-button">Refresh</button>
                        ${
                            demoResetAvailable
                                ? `<button class="secondary-button secondary-button--danger" type="button" id="portal-reset-demo-button" ${
                                      state.portal.isResettingDemo ? 'disabled' : ''
                                  }>${state.portal.isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}</button>`
                                : ''
                        }
                        <button class="secondary-button" type="button" id="portal-logout-button">Sign Out</button>
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
                ${renderSettingsPanel(settings)}
            </div>
            <div class="surface-card lead-column">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Estimate Requests</p>
                        <h2>Recent requests</h2>
                    </div>
                    <p class="surface-meta">Pricing version shown</p>
                </div>
                <div class="lead-list">
                    ${leads.leads.length ? leads.leads.map(renderLeadCard).join('') : renderEmptyLeads()}
                </div>
            </div>
        </section>
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

function renderResetDialog(): string {
    if (!state.portal.isResetDialogOpen) {
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
                        state.portal.isResettingDemo ? 'disabled' : ''
                    }>Keep Current Data</button>
                    <button class="primary-button secondary-button--danger-solid" type="button" id="portal-reset-dialog-confirm" ${
                        state.portal.isResettingDemo ? 'disabled' : ''
                    }>
                        ${state.portal.isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}
                    </button>
                </div>
            </section>
        </div>
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
            <p class="empty-state__title">No requests yet</p>
            <p class="empty-state__copy">
                New estimate requests from your website will appear here.
            </p>
        </div>
    `;
}

function renderSettingsPanel(settings: PortalClientSettings): string {
    const estimatorConfigJson = JSON.stringify(settings.estimatorConfig, null, 2);
    const settingsMessage = state.portal.settingsMessage;
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
            ${settingsMessage ? `<p class="portal-feedback portal-feedback--success">${escapeHtml(settingsMessage)}</p>` : ''}
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
                <button class="primary-button" type="submit">${state.portal.isSavingSettings ? 'Saving...' : 'Save Changes'}</button>
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

function wirePortalEvents() {
    const authModeLoginButton = document.getElementById('portal-auth-mode-login');

    if (authModeLoginButton instanceof HTMLButtonElement) {
        authModeLoginButton.addEventListener('click', () => {
            setAuthMode('login');
        });
    }

    const authModeSignupButton = document.getElementById('portal-auth-mode-signup');

    if (authModeSignupButton instanceof HTMLButtonElement) {
        authModeSignupButton.addEventListener('click', () => {
            setAuthMode('signup');
        });
    }

    const loginForm = document.getElementById('portal-login-form');

    if (loginForm instanceof HTMLFormElement) {
        bindLoginField(loginForm, 'clientId');
        bindLoginField(loginForm, 'email');
        bindLoginField(loginForm, 'password');

        const passwordToggle = document.getElementById('portal-password-toggle');

        if (passwordToggle instanceof HTMLInputElement) {
            passwordToggle.addEventListener('change', () => {
                state.portal.loginForm.showPassword = passwordToggle.checked;
                renderApp();
            });
        }

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(loginForm);
            const clientId = String(formData.get('clientId') ?? '').trim();
            const email = String(formData.get('email') ?? '').trim();
            const password = String(formData.get('password') ?? '');
            state.portal.loginForm = {
                ...state.portal.loginForm,
                clientId,
                email,
                password
            };

            state.portal.status = 'signingIn';
            state.portal.errorMessage = null;
            renderApp();

            try {
                await loginPortal({ clientId, email, password });
                await loadPortalDashboard();
            } catch (error) {
                state.portal = {
                    status: 'error',
                    authMode: 'login',
                    session: null,
                    leads: null,
                    settings: null,
                    errorMessage: getErrorMessage(error, 'Unable to sign in.'),
                    settingsMessage: null,
                    isSavingSettings: false,
                    isResettingDemo: false,
                    isResetDialogOpen: false,
                    loginForm: state.portal.loginForm,
                    signupForm: {
                        ...state.portal.signupForm,
                        password: '',
                        confirmPassword: '',
                        showPassword: false
                    }
                };
                renderApp();
            }
        });
    }

    const signupForm = document.getElementById('portal-signup-form');

    if (signupForm instanceof HTMLFormElement) {
        bindSignupField(signupForm, 'companyName');
        bindSignupField(signupForm, 'clientId');
        bindSignupField(signupForm, 'fullName');
        bindSignupField(signupForm, 'phone');
        bindSignupField(signupForm, 'email');
        bindSignupField(signupForm, 'password');
        bindSignupField(signupForm, 'confirmPassword');

        const signupPasswordToggle = document.getElementById('portal-signup-password-toggle');

        if (signupPasswordToggle instanceof HTMLInputElement) {
            signupPasswordToggle.addEventListener('change', () => {
                state.portal.signupForm.showPassword = signupPasswordToggle.checked;
                renderApp();
            });
        }

        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(signupForm);
            const signupFormState = {
                companyName: String(formData.get('companyName') ?? '').trim(),
                clientId: String(formData.get('clientId') ?? '').trim().toLowerCase(),
                fullName: String(formData.get('fullName') ?? '').trim(),
                phone: String(formData.get('phone') ?? '').trim(),
                email: String(formData.get('email') ?? '').trim(),
                password: String(formData.get('password') ?? ''),
                confirmPassword: String(formData.get('confirmPassword') ?? ''),
                showPassword: state.portal.signupForm.showPassword
            };

            state.portal.signupForm = signupFormState;

            if (signupFormState.password !== signupFormState.confirmPassword) {
                state.portal.errorMessage = 'Password confirmation must match before creating the account.';
                renderApp();
                return;
            }

            state.portal.status = 'signingUp';
            state.portal.errorMessage = null;
            renderApp();

            try {
                await signupPortal({
                    clientId: signupFormState.clientId,
                    companyName: signupFormState.companyName,
                    fullName: signupFormState.fullName,
                    email: signupFormState.email,
                    password: signupFormState.password,
                    phone: signupFormState.phone || undefined
                });
                state.portal.loginForm = {
                    ...state.portal.loginForm,
                    clientId: signupFormState.clientId,
                    email: signupFormState.email,
                    password: '',
                    showPassword: false
                };
                await loadPortalDashboard();
            } catch (error) {
                state.portal = {
                    status: 'error',
                    authMode: 'signup',
                    session: null,
                    leads: null,
                    settings: null,
                    errorMessage: getErrorMessage(error, 'Unable to create your account.'),
                    settingsMessage: null,
                    isSavingSettings: false,
                    isResettingDemo: false,
                    isResetDialogOpen: false,
                    loginForm: {
                        ...state.portal.loginForm,
                        clientId: signupFormState.clientId,
                        email: signupFormState.email,
                        password: '',
                        showPassword: false
                    },
                    signupForm: {
                        ...signupFormState,
                        password: '',
                        confirmPassword: '',
                        showPassword: false
                    }
                };
                renderApp();
            }
        });
    }

    const fillDemoButton = document.getElementById('portal-fill-demo-button');

    if (fillDemoButton instanceof HTMLButtonElement) {
        fillDemoButton.addEventListener('click', () => {
            state.portal.loginForm = {
                ...state.portal.loginForm,
                clientId: portalConfig.defaultClientId,
                email: portalConfig.demoAccess.email,
                password: portalConfig.demoAccess.password
            };
            renderApp();
        });
    }

    const demoCopyButtons = document.querySelectorAll('[data-demo-copy-field]');

    demoCopyButtons.forEach((element) => {
        if (!(element instanceof HTMLButtonElement)) {
            return;
        }

        element.addEventListener('click', async () => {
            const fieldName = element.dataset.demoCopyField;

            if (!isDemoAccessField(fieldName)) {
                return;
            }

            const originalLabel = element.textContent || 'Copy';
            element.disabled = true;

            const copied = await copyTextToClipboard(getDemoAccessValue(fieldName));

            element.textContent = copied ? 'Copied' : 'Unavailable';

            window.setTimeout(() => {
                element.textContent = originalLabel;
                element.disabled = false;
            }, 1400);
        });
    });

    const refreshButton = document.getElementById('portal-refresh-button');

    if (refreshButton instanceof HTMLButtonElement) {
        refreshButton.addEventListener('click', async () => {
            await loadPortalDashboard();
        });
    }

    const resetDemoButton = document.getElementById('portal-reset-demo-button');

    if (resetDemoButton instanceof HTMLButtonElement) {
        resetDemoButton.addEventListener('click', () => {
            if (!isDemoResetAvailable(state.portal.session)) {
                return;
            }

            state.portal.isResetDialogOpen = true;
            renderApp();
        });
    }

    const resetDialogCancelButton = document.getElementById('portal-reset-dialog-cancel');

    if (resetDialogCancelButton instanceof HTMLButtonElement) {
        resetDialogCancelButton.addEventListener('click', () => {
            state.portal.isResetDialogOpen = false;
            renderApp();
        });
    }

    const resetDialogBackdrop = document.getElementById('portal-reset-dialog-backdrop');

    if (resetDialogBackdrop instanceof HTMLDivElement) {
        resetDialogBackdrop.addEventListener('click', (event) => {
            if (event.target === resetDialogBackdrop && !state.portal.isResettingDemo) {
                state.portal.isResetDialogOpen = false;
                renderApp();
            }
        });
    }

    const resetDialogConfirmButton = document.getElementById('portal-reset-dialog-confirm');

    if (resetDialogConfirmButton instanceof HTMLButtonElement) {
        resetDialogConfirmButton.addEventListener('click', async () => {
            state.portal.isResettingDemo = true;
            state.portal.isResetDialogOpen = true;
            state.portal.errorMessage = null;
            state.portal.settingsMessage = null;
            renderApp();

            try {
                await resetPortalDemo();
                await loadPortalDashboard();

                if (state.portal.status === 'ready') {
                    state.portal.settingsMessage = 'Demo reset complete.';
                    state.portal.isResetDialogOpen = false;
                    renderApp();
                }
            } catch (error) {
                state.portal.isResettingDemo = false;
                state.portal.isResetDialogOpen = false;
                state.portal.errorMessage = getErrorMessage(error, 'Unable to reset the demo dashboard.');
                renderApp();
            }
        });
    }

    const logoutButton = document.getElementById('portal-logout-button');

    if (logoutButton instanceof HTMLButtonElement) {
        logoutButton.addEventListener('click', async () => {
            try {
                await logoutPortal();
            } catch {
                // Logging out should still clear the local session even if the network request fails.
            }

            state.portal = {
                status: 'signedOut',
                authMode: 'login',
                session: null,
                leads: null,
                settings: null,
                errorMessage: null,
                settingsMessage: null,
                isSavingSettings: false,
                isResettingDemo: false,
                isResetDialogOpen: false,
                loginForm: {
                    ...state.portal.loginForm,
                    password: '',
                    showPassword: false
                },
                signupForm: createInitialSignupForm({
                    clientId: state.portal.loginForm.clientId,
                    email: state.portal.loginForm.email
                })
            };
            renderApp();
        });
    }

    const settingsForm = document.getElementById('portal-settings-form');

    if (settingsForm instanceof HTMLFormElement) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const currentSettings = state.portal.settings;

            if (!currentSettings) {
                return;
            }

            const formData = new FormData(settingsForm);
            const estimatorConfigText = String(formData.get('estimatorConfig') ?? '');

            let estimatorConfig: PortalClientSettings['estimatorConfig'];

            try {
                estimatorConfig = JSON.parse(estimatorConfigText) as PortalClientSettings['estimatorConfig'];
            } catch {
                state.portal.settingsMessage = null;
                state.portal.errorMessage = 'Pricing settings format is invalid. Please review the entries and try again.';
                renderApp();
                return;
            }

            state.portal.isSavingSettings = true;
            state.portal.errorMessage = null;
            state.portal.settingsMessage = null;
            renderApp();

            try {
                const updatedSettings = await updatePortalClientSettings({
                    companyName: String(formData.get('companyName') ?? '').trim(),
                    logoUrl: normalizeOptionalValue(formData.get('logoUrl')),
                    phone: normalizeOptionalValue(formData.get('phone')),
                    notificationEmail: normalizeOptionalValue(formData.get('notificationEmail')),
                    estimatorConfig
                });

                state.portal.settings = updatedSettings;
                state.portal.isSavingSettings = false;
                state.portal.settingsMessage = 'Company settings saved.';
                renderApp();
            } catch (error) {
                state.portal.isSavingSettings = false;
                state.portal.errorMessage = getErrorMessage(error, 'Unable to save company settings.');
                renderApp();
            }
        });
    }
}

function applyPortalBranding() {
    const branding = state.portal.session?.client.branding;

    rootElement.style.setProperty('--portal-accent', branding?.primaryColor ?? '#b45309');
    rootElement.style.setProperty('--portal-accent-secondary', branding?.secondaryColor ?? '#0f766e');
    rootElement.style.setProperty('--portal-font-family', branding?.fontFamily ?? '"Avenir Next", "Segoe UI", sans-serif');
}

function bindLoginField(
    loginForm: HTMLFormElement,
    fieldName: 'clientId' | 'email' | 'password'
) {
    const field = loginForm.elements.namedItem(fieldName);

    if (!(field instanceof HTMLInputElement)) {
        return;
    }

    field.addEventListener('input', () => {
        state.portal.loginForm[fieldName] = field.value;
    });
}

function bindSignupField(
    signupForm: HTMLFormElement,
    fieldName: 'companyName' | 'clientId' | 'fullName' | 'phone' | 'email' | 'password' | 'confirmPassword'
) {
    const field = signupForm.elements.namedItem(fieldName);

    if (!(field instanceof HTMLInputElement)) {
        return;
    }

    field.addEventListener('input', () => {
        state.portal.signupForm[fieldName] = field.value;
    });
}

function setAuthMode(mode: AuthMode) {
    if (state.portal.authMode === mode) {
        return;
    }

    if (mode === 'signup') {
        state.portal.signupForm = {
            ...state.portal.signupForm,
            clientId: getSignupPrefillClientId(state.portal.signupForm.clientId || state.portal.loginForm.clientId),
            email: state.portal.signupForm.email || state.portal.loginForm.email
        };
    } else {
        state.portal.loginForm = {
            ...state.portal.loginForm,
            clientId: state.portal.signupForm.clientId || state.portal.loginForm.clientId,
            email: state.portal.signupForm.email || state.portal.loginForm.email,
            password: ''
        };
    }

    state.portal.authMode = mode;
    state.portal.status = 'signedOut';
    state.portal.errorMessage = null;
    renderApp();
}

function isDemoResetAvailable(session: PortalSession | null): boolean {
    return Boolean(session && session.client.name === portalConfig.defaultClientId);
}

function normalizePortalTitle(value: string): string {
    return value.replace(/client portal/gi, 'Private Dashboard').replace(/portal/gi, 'Dashboard');
}

function createInitialSignupForm(overrides?: Partial<AppState['portal']['signupForm']>): AppState['portal']['signupForm'] {
    const form: AppState['portal']['signupForm'] = {
        companyName: '',
        clientId: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        showPassword: false
    };

    if (overrides) {
        Object.assign(form, overrides);
    }

    form.clientId = getSignupPrefillClientId(overrides?.clientId);
    form.password = '';
    form.confirmPassword = '';
    form.showPassword = false;

    return form;
}

function getSignupPrefillClientId(value: string | undefined): string {
    if (!value) {
        return '';
    }

    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue || normalizedValue === portalConfig.defaultClientId.trim().toLowerCase()) {
        return '';
    }

    return value;
}

function isDemoAccessField(value: string | undefined): value is DemoAccessField {
    return value === 'clientId' || value === 'email' || value === 'password';
}

function getDemoAccessValue(field: DemoAccessField): string {
    switch (field) {
        case 'clientId':
            return portalConfig.defaultClientId;
        case 'email':
            return portalConfig.demoAccess.email;
        case 'password':
            return portalConfig.demoAccess.password;
    }
}

async function copyTextToClipboard(value: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch {
        // Fall back to a temporary textarea when the Clipboard API is unavailable.
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.append(textArea);
    textArea.select();

    let copied = false;

    try {
        copied = document.execCommand('copy');
    } catch {
        copied = false;
    }

    textArea.remove();
    return copied;
}

function normalizeOptionalValue(value: FormDataEntryValue | null): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue || undefined;
}

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

function formatDateTime(value: string): string {
    return dateTimeFormatter.format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

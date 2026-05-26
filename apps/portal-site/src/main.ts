import { portalConfig } from './portalConfig';
import {
    fetchPortalBillingSummary,
    fetchPortalClientSettings,
    fetchPortalLeads,
    fetchPortalSession,
    loginPortal,
    logoutPortal,
    resetPortalDemo,
    signupPortal,
    startPortalCheckout,
    updatePortalClientSettings
} from './portalApi';
import {
    PortalBillingPlanCode,
    PortalBillingSummary,
    PortalClientSettings,
    PortalLeadsResponse,
    PortalSession
} from './portalTypes';
import './styles.css';

type PortalStatus = 'signedOut' | 'loading' | 'signingIn' | 'signingUp' | 'ready' | 'error';
type AuthMode = 'login' | 'signup';
type DemoAccessField = 'clientId' | 'email' | 'password';
type PortalBillingStatus = 'idle' | 'loading' | 'ready' | 'error';
type PortalCheckoutStatus = 'idle' | 'submitting' | 'redirecting' | 'error';

interface AppState {
    portal: {
        status: PortalStatus;
        authMode: AuthMode;
        session: PortalSession | null;
        leads: PortalLeadsResponse | null;
        settings: PortalClientSettings | null;
        billing: {
            status: PortalBillingStatus;
            summary: PortalBillingSummary | null;
            errorMessage: string | null;
            selectedPlanCode: PortalBillingPlanCode;
            checkoutStatus: PortalCheckoutStatus;
            checkoutErrorMessage: string | null;
        };
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
const initialAuthMode = resolveInitialAuthMode(window.location.pathname);
let portalBillingRequestSequence = 0;
const BILLING_CHECKOUT_PLANS: Array<{ code: PortalBillingPlanCode; label: string; detail: string }> = [
    {
        code: 'starter_monthly',
        label: 'Starter Monthly',
        detail: 'Basic recurring plan for early customer rollout.'
    },
    {
        code: 'growth_monthly',
        label: 'Growth Monthly',
        detail: 'Expanded recurring plan for higher-volume usage.'
    }
];

const state: AppState = {
    portal: {
        status: 'loading',
        authMode: initialAuthMode,
        session: null,
        leads: null,
        settings: null,
        billing: {
            status: 'idle',
            summary: null,
            errorMessage: null,
            selectedPlanCode: 'starter_monthly',
            checkoutStatus: 'idle',
            checkoutErrorMessage: null
        },
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
            billing: {
                status: 'loading',
                summary: state.portal.billing.summary,
                errorMessage: null,
                selectedPlanCode: state.portal.billing.selectedPlanCode,
                checkoutStatus: 'idle',
                checkoutErrorMessage: null
            },
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
        renderApp();
        void loadPortalBillingSummary();
        return;
    } catch (error) {
        const statusCode = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: unknown }).statusCode) : null;
        const isUnauthorized = statusCode === 401;

        state.portal = {
            status: isUnauthorized && options?.suppressErrorOnUnauthorized ? 'signedOut' : 'error',
            authMode: state.portal.authMode,
            session: null,
            leads: null,
            settings: null,
            billing: {
                status: 'idle',
                summary: null,
                errorMessage: null,
                selectedPlanCode: state.portal.billing.selectedPlanCode,
                checkoutStatus: 'idle',
                checkoutErrorMessage: null
            },
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

async function loadPortalBillingSummary() {
    const requestId = ++portalBillingRequestSequence;

    state.portal.billing = {
        status: 'loading',
        summary: state.portal.billing.summary,
        errorMessage: null,
        selectedPlanCode: state.portal.billing.selectedPlanCode,
        checkoutStatus: state.portal.billing.checkoutStatus,
        checkoutErrorMessage: state.portal.billing.checkoutErrorMessage
    };
    renderApp();

    try {
        const summary = await fetchPortalBillingSummary();

        if (requestId !== portalBillingRequestSequence || state.portal.status !== 'ready') {
            return;
        }

        state.portal.billing = {
            status: 'ready',
            summary,
            errorMessage: null,
            selectedPlanCode: state.portal.billing.selectedPlanCode,
            checkoutStatus: state.portal.billing.checkoutStatus,
            checkoutErrorMessage: state.portal.billing.checkoutErrorMessage
        };
    } catch (error) {
        if (requestId !== portalBillingRequestSequence || state.portal.status !== 'ready') {
            return;
        }

        state.portal.billing = {
            status: 'error',
            summary: state.portal.billing.summary,
            errorMessage: getErrorMessage(error, 'Unable to load billing details right now.'),
            selectedPlanCode: state.portal.billing.selectedPlanCode,
            checkoutStatus: state.portal.billing.checkoutStatus,
            checkoutErrorMessage: state.portal.billing.checkoutErrorMessage
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
                    <h1>Review estimate requests before they go cold.</h1>
                    <p class="hero-copy">
                        Sign in to manage submitted requests, pricing rules, company details, and estimator configuration.
                    </p>
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
                        <h2>${isSignupMode ? 'Create your company account' : 'Sign in to Estimate Engine'}</h2>
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
    const billingPanelMarkup = renderBillingPanel();

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
                ${billingPanelMarkup}
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

function renderBillingPanel(): string {
    const billingState = state.portal.billing;
    const checkoutControlsMarkup = renderBillingCheckoutControls();

    if (billingState.status === 'loading') {
        return `
            <section class="billing-panel">
                <div class="settings-panel__header">
                    <div>
                        <p class="card-label">Billing Summary</p>
                        <h3>Current billing status</h3>
                    </div>
                    <p class="surface-meta">Loading</p>
                </div>
                <p class="surface-copy">
                    Checking your current billing status and entitlement summary.
                </p>
                ${checkoutControlsMarkup}
                <div class="portal-loading">
                    <div class="portal-loading-bar"></div>
                </div>
            </section>
        `;
    }

    if (billingState.status === 'error') {
        return `
            <section class="billing-panel">
                <div class="settings-panel__header">
                    <div>
                        <p class="card-label">Billing Summary</p>
                        <h3>Current billing status</h3>
                    </div>
                    <button class="secondary-button" type="button" id="portal-refresh-billing-button">Refresh Billing</button>
                </div>
                <p class="portal-feedback portal-feedback--error">
                    ${escapeHtml(billingState.errorMessage || 'Unable to load billing details right now.')}
                </p>
                <p class="surface-copy">
                    Your dashboard access is still available. This only affects the billing summary section.
                </p>
                ${checkoutControlsMarkup}
            </section>
        `;
    }

    if (!billingState.summary) {
        return `
            <section class="billing-panel">
                <div class="settings-panel__header">
                    <div>
                        <p class="card-label">Billing Summary</p>
                        <h3>Current billing status</h3>
                    </div>
                    <button class="secondary-button" type="button" id="portal-refresh-billing-button">Refresh Billing</button>
                </div>
                <p class="surface-copy">
                    Billing details are not available yet. Your company dashboard access remains available.
                </p>
                ${checkoutControlsMarkup}
            </section>
        `;
    }

    const { enforcementState, subscription, entitlements } = billingState.summary;
    const hasActiveSubscriptionSnapshot = subscription.status !== null;
    const billingCopy = hasActiveSubscriptionSnapshot
        ? 'This summary comes from the normalized billing model in your account. It does not change product access by itself in the current rollout.'
        : enforcementState === 'not_enforced'
          ? 'No active subscription is recorded yet. Billing is not currently enforced, so your company can continue using the portal and current product features.'
          : 'No active subscription is recorded yet. Billing enforcement is enabled for new tenants, so the next billing step will need to be completed.';

    return `
        <section class="billing-panel">
            <div class="settings-panel__header">
                <div>
                    <p class="card-label">Billing Summary</p>
                    <h3>Current billing status</h3>
                </div>
                <button class="secondary-button" type="button" id="portal-refresh-billing-button">Refresh Billing</button>
            </div>
            <p class="surface-copy">${escapeHtml(billingCopy)}</p>
            <div class="billing-summary-grid">
                ${renderBillingFact('Enforcement', formatBillingEnforcementState(enforcementState))}
                ${renderBillingFact('Subscription Status', formatBillingSubscriptionStatus(subscription.status))}
                ${renderBillingFact('Plan Code', subscription.planCode ?? 'No active subscription')}
                ${renderBillingFact('Billing Interval', formatBillingInterval(subscription.billingInterval))}
                ${renderBillingFact('Currency', subscription.currencyCode ?? 'Not set')}
                ${renderBillingFact('Amount', formatBillingAmount(subscription.unitAmountMinor, subscription.currencyCode))}
                ${renderBillingFact('Current Period Starts', formatOptionalDateTime(subscription.currentPeriodStartsAt))}
                ${renderBillingFact('Current Period Ends', formatOptionalDateTime(subscription.currentPeriodEndsAt))}
                ${renderBillingFact('Cancel At Period End', formatBooleanStatus(subscription.cancelAtPeriodEnd))}
                ${renderBillingFact('Canceled At', formatOptionalDateTime(subscription.canceledAt))}
                ${renderBillingFact('Ended At', formatOptionalDateTime(subscription.endedAt))}
            </div>
            <div class="settings-history">
                <div class="settings-history__header">
                    <p class="card-label">Entitlements</p>
                    <p class="surface-meta">Normalized read model</p>
                </div>
                <div class="billing-entitlement-list">
                    ${renderBillingEntitlement('Portal access', entitlements.portalAccess)}
                    ${renderBillingEntitlement('Widget publish', entitlements.widgetPublish)}
                    ${renderBillingEntitlement('Branded experience', entitlements.brandedExperience)}
                </div>
            </div>
            ${checkoutControlsMarkup}
        </section>
    `;
}

function renderBillingCheckoutControls(): string {
    const billingState = state.portal.billing;
    const selectedPlan = getBillingPlanOption(billingState.selectedPlanCode);
    const isSubmitting = billingState.checkoutStatus === 'submitting';
    const isRedirecting = billingState.checkoutStatus === 'redirecting';
    const helperCopy =
        billingState.summary?.enforcementState === 'not_enforced'
            ? 'Checkout is optional right now. Platform access remains available while billing enforcement is off.'
            : 'Checkout prepares the next billing step for your tenant using the normalized backend billing flow.';

    return `
        <section class="billing-checkout">
            <div class="settings-history__header">
                <div>
                    <p class="card-label">Checkout</p>
                    <h3>Start a subscription checkout</h3>
                </div>
                <p class="surface-meta">Canonical plan codes only</p>
            </div>
            <p class="surface-copy">${escapeHtml(helperCopy)}</p>
            ${billingState.checkoutErrorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(billingState.checkoutErrorMessage)}</p>` : ''}
            ${isRedirecting ? '<p class="portal-feedback portal-feedback--success">Checkout started. Redirecting to the hosted checkout now.</p>' : ''}
            <form id="portal-billing-checkout-form" class="billing-checkout-form">
                <label class="field">
                    <span class="field-label">Plan</span>
                    <select class="field-input" name="planCode" ${isSubmitting || isRedirecting ? 'disabled' : ''}>
                        ${BILLING_CHECKOUT_PLANS.map((plan) => renderBillingPlanOption(plan.code, plan.label, plan.detail, plan.code === billingState.selectedPlanCode)).join('')}
                    </select>
                    <span class="field-hint">${escapeHtml(selectedPlan.detail)}</span>
                </label>
                <button class="primary-button billing-checkout-form__submit" type="submit" ${isSubmitting || isRedirecting ? 'disabled' : ''}>
                    ${isSubmitting ? 'Starting Checkout...' : isRedirecting ? 'Redirecting...' : 'Start Checkout'}
                </button>
            </form>
        </section>
    `;
}

function renderBillingPlanOption(code: PortalBillingPlanCode, label: string, detail: string, isSelected: boolean): string {
    return `<option value="${escapeHtml(code)}" ${isSelected ? 'selected' : ''}>${escapeHtml(label)} - ${escapeHtml(detail)}</option>`;
}

function renderBillingFact(label: string, value: string): string {
    return `
        <div class="billing-summary-card">
            <p class="metric-label">${escapeHtml(label)}</p>
            <p class="billing-summary-card__value">${escapeHtml(value)}</p>
        </div>
    `;
}

function renderBillingEntitlement(label: string, enabled: boolean): string {
    return `
        <div class="billing-entitlement">
            <span class="billing-entitlement__label">${escapeHtml(label)}</span>
            <span class="billing-entitlement__badge${enabled ? ' is-allowed' : ' is-limited'}">
                ${enabled ? 'Available' : 'Unavailable'}
            </span>
        </div>
    `;
}

function getBillingPlanOption(planCode: PortalBillingPlanCode): { code: PortalBillingPlanCode; label: string; detail: string } {
    return BILLING_CHECKOUT_PLANS.find((plan) => plan.code === planCode) ?? BILLING_CHECKOUT_PLANS[0];
}

function isPortalBillingPlanCode(value: string): value is PortalBillingPlanCode {
    return BILLING_CHECKOUT_PLANS.some((plan) => plan.code === value);
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
                    billing: {
                        status: 'idle',
                        summary: null,
                        errorMessage: null,
                        selectedPlanCode: state.portal.billing.selectedPlanCode,
                        checkoutStatus: 'idle',
                        checkoutErrorMessage: null
                    },
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
                    billing: {
                        status: 'idle',
                        summary: null,
                        errorMessage: null,
                        selectedPlanCode: state.portal.billing.selectedPlanCode,
                        checkoutStatus: 'idle',
                        checkoutErrorMessage: null
                    },
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

    const refreshBillingButton = document.getElementById('portal-refresh-billing-button');

    if (refreshBillingButton instanceof HTMLButtonElement) {
        refreshBillingButton.addEventListener('click', async () => {
            if (state.portal.status !== 'ready') {
                return;
            }

            await loadPortalBillingSummary();
        });
    }

    const billingCheckoutForm = document.getElementById('portal-billing-checkout-form');

    if (billingCheckoutForm instanceof HTMLFormElement) {
        const planField = billingCheckoutForm.elements.namedItem('planCode');

        if (planField instanceof HTMLSelectElement) {
            planField.addEventListener('change', () => {
                if (!isPortalBillingPlanCode(planField.value)) {
                    return;
                }

                state.portal.billing.selectedPlanCode = planField.value;
                state.portal.billing.checkoutStatus = 'idle';
                state.portal.billing.checkoutErrorMessage = null;
                renderApp();
            });
        }

        billingCheckoutForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (state.portal.status !== 'ready') {
                return;
            }

            const formData = new FormData(billingCheckoutForm);
            const planCode = String(formData.get('planCode') ?? '');

            if (!isPortalBillingPlanCode(planCode)) {
                state.portal.billing.checkoutStatus = 'error';
                state.portal.billing.checkoutErrorMessage = 'Select a valid plan before starting checkout.';
                renderApp();
                return;
            }

            state.portal.billing.selectedPlanCode = planCode;
            state.portal.billing.checkoutStatus = 'submitting';
            state.portal.billing.checkoutErrorMessage = null;
            renderApp();

            try {
                const checkoutSession = await startPortalCheckout(planCode);

                state.portal.billing.checkoutStatus = 'redirecting';
                state.portal.billing.checkoutErrorMessage = null;
                renderApp();

                window.location.assign(checkoutSession.checkoutUrl);
            } catch (error) {
                state.portal.billing.checkoutStatus = 'error';
                state.portal.billing.checkoutErrorMessage = getCheckoutErrorMessage(error);
                renderApp();
            }
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
                billing: {
                    status: 'idle',
                    summary: null,
                    errorMessage: null,
                    selectedPlanCode: state.portal.billing.selectedPlanCode,
                    checkoutStatus: 'idle',
                    checkoutErrorMessage: null
                },
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
    syncAuthModePath(mode);
    renderApp();
}

function isDemoResetAvailable(session: PortalSession | null): boolean {
    return Boolean(session && session.client.name === portalConfig.defaultClientId);
}

function resolveInitialAuthMode(pathname: string): AuthMode {
    const normalizedPath = normalizePortalPath(pathname);

    if (normalizedPath === '/signup') {
        return 'signup';
    }

    return 'login';
}

function syncAuthModePath(mode: AuthMode): void {
    const nextPath = mode === 'signup' ? '/signup' : '/login';

    if (normalizePortalPath(window.location.pathname) === nextPath) {
        return;
    }

    window.history.replaceState(window.history.state, '', nextPath);
}

function normalizePortalPath(pathname: string): string {
    const normalizedPath = pathname.trim().replace(/\/+$/, '');

    return normalizedPath || '/';
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

function formatBillingAmount(value: number | null, currencyCode: string | null): string {
    if (value === null || !currencyCode) {
        return 'Not set';
    }

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode
        }).format(value / 100);
    } catch {
        return `${currencyCode} ${(value / 100).toFixed(2)}`;
    }
}

function formatDateTime(value: string): string {
    return dateTimeFormatter.format(new Date(value));
}

function formatOptionalDateTime(value: string | null): string {
    return value ? formatDateTime(value) : 'Not set';
}

function formatBooleanStatus(value: boolean): string {
    return value ? 'Yes' : 'No';
}

function formatBillingEnforcementState(value: PortalBillingSummary['enforcementState']): string {
    return value === 'not_enforced' ? 'Not enforced' : 'Enforced';
}

function formatBillingSubscriptionStatus(value: PortalBillingSummary['subscription']['status']): string {
    if (!value) {
        return 'No active subscription';
    }

    return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBillingInterval(value: PortalBillingSummary['subscription']['billingInterval']): string {
    if (!value) {
        return 'Not set';
    }

    return value === 'manual' ? 'Manual' : value === 'month' ? 'Monthly' : 'Yearly';
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

function getCheckoutErrorMessage(error: unknown): string {
    if (
        error instanceof Error &&
        'code' in error &&
        (error as { code?: unknown }).code === 'billing_provider_not_configured'
    ) {
        return 'Billing checkout is not configured for this environment yet.';
    }

    return getErrorMessage(error, 'Checkout is temporarily unavailable. Please try again.');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

import {
    fetchPortalBillingSummary,
    fetchPortalClientSettings,
    fetchPortalLeads,
    fetchPortalSession,
    loginPortal,
    logoutPortal,
    resetPortalDemo,
    signupPortal,
    updatePortalClientSettings
} from './portalApi';
import { portalConfig } from './portalConfig';
import { createInitialSignupForm, getSignupPrefillClientId, PortalState, state } from './portalState';
import { PortalClientSettings } from './portalTypes';
import { renderResetDialog, isDemoResetAvailable } from './features/demo-reset/demoResetPanel';
import { copyTextToClipboard, getDemoAccessValue, isDemoAccessField } from './features/auth/demoCredentials';
import { renderPortalShell } from './layout/PortalShell';
import { renderDashboardPage } from './pages/DashboardPage';
import { renderLeadsPage } from './pages/LeadsPage';
import { renderLoginPage } from './pages/LoginPage';
import { renderSettingsPage } from './pages/SettingsPage';
import { renderSignupPage } from './pages/SignupPage';
import { createPortalRouter, isProtectedRoute, PortalRoute } from './router';
import { getErrorMessage, getStatusCode } from './shared/apiError';
import './styles.css';

const appRoot = document.getElementById('app-root');

if (!(appRoot instanceof HTMLElement)) {
    throw new Error('App root element #app-root was not found');
}

const rootElement: HTMLElement = appRoot;
let portalBillingRequestSequence = 0;

const router = createPortalRouter({
    onRouteChange: () => {
        renderApp();
    }
});

router.bindLinkHandling(rootElement);
state.portal.status = 'loading';
renderApp();
void hydratePortalSession();

async function hydratePortalSession(): Promise<void> {
    await loadPortalDashboard({ suppressErrorOnUnauthorized: true });
}

async function loadPortalDashboard(options?: { suppressErrorOnUnauthorized?: boolean }): Promise<void> {
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
            ...state.portal,
            status: 'ready',
            session,
            leads,
            settings,
            billing: {
                status: 'loading',
                summary: state.portal.billing.summary,
                errorMessage: null
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
        const isUnauthorized = getStatusCode(error) === 401;

        state.portal = {
            ...state.portal,
            status: isUnauthorized && options?.suppressErrorOnUnauthorized ? 'signedOut' : 'error',
            session: null,
            leads: null,
            settings: null,
            billing: {
                status: 'idle',
                summary: null,
                errorMessage: null
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

async function loadPortalBillingSummary(): Promise<void> {
    const requestId = ++portalBillingRequestSequence;

    state.portal.billing = {
        status: 'loading',
        summary: state.portal.billing.summary,
        errorMessage: null
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
            errorMessage: null
        };
    } catch (error) {
        if (requestId !== portalBillingRequestSequence || state.portal.status !== 'ready') {
            return;
        }

        state.portal.billing = {
            status: 'error',
            summary: state.portal.billing.summary,
            errorMessage: getErrorMessage(error, 'Unable to load billing details right now.')
        };
    }

    renderApp();
}

function renderApp(): void {
    const currentRoute = router.getRoute();
    const redirectRoute = getRedirectRoute(currentRoute);

    if (redirectRoute && redirectRoute !== currentRoute) {
        router.replace(redirectRoute);
        return;
    }

    const route = redirectRoute ?? currentRoute;
    syncAuthModeForRoute(route);

    rootElement.innerHTML = `
        ${renderPortalShell({
            portal: state.portal,
            route,
            content: renderRouteContent(route)
        })}
        ${renderResetDialog(state.portal)}
    `;

    wirePortalEvents();
    applyPortalBranding();
}

function getRedirectRoute(route: PortalRoute): PortalRoute | null {
    if (state.portal.status === 'loading' || state.portal.status === 'signingIn' || state.portal.status === 'signingUp') {
        return null;
    }

    if (route === '/') {
        return state.portal.status === 'ready' ? '/dashboard' : '/login';
    }

    if (isProtectedRoute(route) && state.portal.status !== 'ready') {
        return '/login';
    }

    if ((route === '/login' || route === '/signup') && state.portal.status === 'ready') {
        return '/dashboard';
    }

    return route;
}

function renderRouteContent(route: PortalRoute): string {
    switch (route) {
        case '/':
            return renderRouteLoading();
        case '/login':
            return renderLoginPage(state.portal);
        case '/signup':
            return renderSignupPage(state.portal);
        case '/dashboard':
            return renderDashboardPage(state.portal);
        case '/leads':
            return renderLeadsPage(state.portal);
        case '/settings':
            return renderSettingsPage(state.portal);
    }
}

function renderRouteLoading(): string {
    return `
        <section class="surface-card">
            <div class="portal-loading">
                <p class="portal-loading-title">Please wait</p>
                <p class="portal-loading-copy">Checking your portal session.</p>
                <div class="portal-loading-bar"></div>
            </div>
        </section>
    `;
}

function wirePortalEvents(): void {
    wireLoginForm();
    wireSignupForm();
    wireDemoCredentials();
    wireRefreshActions();
    wireDemoResetActions();
    wireLogoutAction();
    wireSettingsForm();
}

function wireLoginForm(): void {
    const loginForm = document.getElementById('portal-login-form');

    if (!(loginForm instanceof HTMLFormElement)) {
        return;
    }

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
            router.replace('/dashboard');
        } catch (error) {
            state.portal = {
                ...state.portal,
                status: 'error',
                authMode: 'login',
                session: null,
                leads: null,
                settings: null,
                billing: {
                    status: 'idle',
                    summary: null,
                    errorMessage: null
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

function wireSignupForm(): void {
    const signupForm = document.getElementById('portal-signup-form');

    if (!(signupForm instanceof HTMLFormElement)) {
        return;
    }

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
            router.replace('/dashboard');
        } catch (error) {
            state.portal = {
                ...state.portal,
                status: 'error',
                authMode: 'signup',
                session: null,
                leads: null,
                settings: null,
                billing: {
                    status: 'idle',
                    summary: null,
                    errorMessage: null
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

function wireDemoCredentials(): void {
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
}

function wireRefreshActions(): void {
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
}

function wireDemoResetActions(): void {
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
}

function wireLogoutAction(): void {
    const logoutButton = document.getElementById('portal-logout-button');

    if (!(logoutButton instanceof HTMLButtonElement)) {
        return;
    }

    logoutButton.addEventListener('click', async () => {
        try {
            await logoutPortal();
        } catch {
            // Logging out should still clear the local session even if the network request fails.
        }

        state.portal = {
            ...state.portal,
            status: 'signedOut',
            authMode: 'login',
            session: null,
            leads: null,
            settings: null,
            billing: {
                status: 'idle',
                summary: null,
                errorMessage: null
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
        router.replace('/login');
    });
}

function wireSettingsForm(): void {
    const settingsForm = document.getElementById('portal-settings-form');

    if (!(settingsForm instanceof HTMLFormElement)) {
        return;
    }

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

function applyPortalBranding(): void {
    const branding = state.portal.session?.client.branding;

    rootElement.style.setProperty('--portal-accent', branding?.primaryColor ?? '#b45309');
    rootElement.style.setProperty('--portal-accent-secondary', branding?.secondaryColor ?? '#0f766e');
    rootElement.style.setProperty('--portal-font-family', branding?.fontFamily ?? '"Avenir Next", "Segoe UI", sans-serif');
}

function bindLoginField(
    loginForm: HTMLFormElement,
    fieldName: 'clientId' | 'email' | 'password'
): void {
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
): void {
    const field = signupForm.elements.namedItem(fieldName);

    if (!(field instanceof HTMLInputElement)) {
        return;
    }

    field.addEventListener('input', () => {
        state.portal.signupForm[fieldName] = field.value;
    });
}

function syncAuthModeForRoute(route: PortalRoute): void {
    if (route === '/signup') {
        state.portal.authMode = 'signup';
        state.portal.signupForm = {
            ...state.portal.signupForm,
            clientId: getSignupPrefillClientId(state.portal.signupForm.clientId || state.portal.loginForm.clientId),
            email: state.portal.signupForm.email || state.portal.loginForm.email
        };
    }

    if (route === '/login') {
        state.portal.authMode = 'login';
        state.portal.loginForm = {
            ...state.portal.loginForm,
            clientId: state.portal.signupForm.clientId || state.portal.loginForm.clientId,
            email: state.portal.signupForm.email || state.portal.loginForm.email
        };
    }
}

function normalizeOptionalValue(value: FormDataEntryValue | null): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue || undefined;
}

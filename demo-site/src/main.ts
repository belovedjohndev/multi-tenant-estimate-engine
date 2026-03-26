import { mountWidget, MountedWidget } from '../../widget/src';
import { demoConfig } from './demoConfig';
import {
    fetchPortalClientSettings,
    fetchPortalLeads,
    fetchPortalSession,
    loginPortal,
    logoutPortal,
    updatePortalClientSettings
} from './portalApi';
import { PortalClientSettings, PortalLeadsResponse, PortalSession } from './portalTypes';
import './styles.css';

type PortalStatus = 'signedOut' | 'loading' | 'signingIn' | 'ready' | 'error';

interface AppState {
    portal: {
        status: PortalStatus;
        token: string | null;
        session: PortalSession | null;
        leads: PortalLeadsResponse | null;
        settings: PortalClientSettings | null;
        errorMessage: string | null;
        settingsMessage: string | null;
        isSavingSettings: boolean;
    };
}

const appRoot = document.getElementById('app-root');

if (!(appRoot instanceof HTMLElement)) {
    throw new Error('App root element #app-root was not found');
}

const rootElement: HTMLElement = appRoot;

const SESSION_STORAGE_KEY = 'estimate-engine.portal.session-token';
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
});

let mountedWidget: MountedWidget | null = null;
let currentWidgetHost: HTMLElement | null = null;

const state: AppState = {
    portal: {
        status: 'signedOut',
        token: loadSessionToken(),
        session: null,
        leads: null,
        settings: null,
        errorMessage: null,
        settingsMessage: null,
        isSavingSettings: false
    }
};

renderApp();
void hydratePortalSession();

async function hydratePortalSession() {
    const token = state.portal.token;

    if (!token) {
        return;
    }

    await loadPortalDashboard(token);
}

async function loadPortalDashboard(token: string) {
    state.portal.status = 'loading';
    state.portal.errorMessage = null;
    renderApp();

    try {
        const [session, leads, settings] = await Promise.all([
            fetchPortalSession(token),
            fetchPortalLeads(token),
            fetchPortalClientSettings(token)
        ]);

        state.portal = {
            status: 'ready',
            token,
            session,
            leads,
            settings,
            errorMessage: null,
            settingsMessage: null,
            isSavingSettings: false
        };
    } catch (error) {
        clearSessionToken();
        state.portal = {
            status: 'error',
            token: null,
            session: null,
            leads: null,
            settings: null,
            errorMessage: getErrorMessage(error, 'Unable to load the client dashboard.'),
            settingsMessage: null,
            isSavingSettings: false
        };
    }

    renderApp();
}

function renderApp() {
    rootElement.innerHTML = `
        <div class="demo-shell">
            <section class="hero">
                <p class="eyebrow">Estimate Engine SaaS</p>
                <h1>Live estimator demo on the left, authenticated client dashboard on the right.</h1>
                <p class="hero-copy">
                    This environment now demonstrates both sides of the product: a public widget experience for lead capture
                    and a private portal experience for clients to review the leads that come in.
                </p>
            </section>

            <section class="surface-grid">
                <article class="surface-card">
                    <div class="surface-header">
                        <div>
                            <p class="card-label">Widget Demo</p>
                            <h2>Public lead capture flow</h2>
                        </div>
                        <p class="surface-meta">Uses ${escapeHtml(demoConfig.clientId)} tenant config</p>
                    </div>
                    <p class="surface-copy">
                        This remains the owned website experience. Prospects can calculate an estimate, submit their contact
                        details, and trigger the production backend flow.
                    </p>
                    <div class="widget-zone">
                        <div id="widget-root"></div>
                    </div>
                </article>

                <article class="surface-card surface-card--portal">
                    ${renderPortalCard()}
                </article>
            </section>
        </div>
    `;

    wirePortalEvents();
    ensureWidgetMounted();
    applyPortalBranding();
}

function renderPortalCard(): string {
    const { status, session, leads, settings, errorMessage } = state.portal;

    if (status === 'ready' && session && leads && settings) {
        return renderDashboard(session, leads, settings);
    }

    return `
        <div class="surface-header">
            <div>
                <p class="card-label">Client Portal</p>
                <h2>Dashboard v1</h2>
            </div>
            <p class="surface-meta">Auth + recent leads</p>
        </div>
        <p class="surface-copy">
            Sign in as a client user to view recent leads, estimate totals, and activity from the widget flow.
        </p>
        ${errorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(errorMessage)}</p>` : ''}
        ${status === 'loading' || status === 'signingIn' ? renderPortalLoading(status) : renderLoginForm()}
    `;
}

function renderPortalLoading(status: PortalStatus): string {
    const copy =
        status === 'signingIn'
            ? 'Verifying credentials and opening the client session.'
            : 'Loading the authenticated dashboard and recent lead data.';

    return `
        <div class="portal-loading">
            <p class="portal-loading-title">Please wait</p>
            <p class="portal-loading-copy">${escapeHtml(copy)}</p>
            <div class="portal-loading-bar"></div>
        </div>
    `;
}

function renderLoginForm(): string {
    return `
        <form id="portal-login-form" class="portal-form">
            <label class="field">
                <span class="field-label">Client ID</span>
                <input class="field-input" name="clientId" type="text" value="${escapeHtml(demoConfig.clientId)}" autocomplete="organization" />
            </label>
            <label class="field">
                <span class="field-label">Email</span>
                <input class="field-input" name="email" type="email" placeholder="owner@example.com" autocomplete="email" />
            </label>
            <label class="field">
                <span class="field-label">Password</span>
                <input class="field-input" name="password" type="password" placeholder="Minimum 8 characters" autocomplete="current-password" />
            </label>
            <button class="primary-button" type="submit">Open Dashboard</button>
        </form>
    `;
}

function renderDashboard(session: PortalSession, leads: PortalLeadsResponse, settings: PortalClientSettings): string {
    const errorMessage = state.portal.errorMessage;

    return `
        <div class="surface-header">
            <div>
                <p class="card-label">Client Portal</p>
                <h2>${escapeHtml(settings.companyName)} dashboard</h2>
            </div>
            <div class="portal-actions">
                <button class="secondary-button" type="button" id="portal-refresh-button">Refresh</button>
                <button class="secondary-button" type="button" id="portal-logout-button">Sign Out</button>
            </div>
        </div>
        <p class="surface-copy">
            Signed in as <strong>${escapeHtml(session.user.fullName)}</strong> (${escapeHtml(session.user.email)}).
            Session expires ${escapeHtml(formatDateTime(session.session.expiresAt))}.
        </p>
        ${errorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(errorMessage)}</p>` : ''}
        <div class="metric-grid">
            ${renderMetricCard('Total Leads', String(leads.summary.totalLeadCount))}
            ${renderMetricCard(
                'Average Estimate',
                leads.summary.averageEstimateTotal === null ? 'No data' : formatCurrency(leads.summary.averageEstimateTotal)
            )}
            ${renderMetricCard(
                'Latest Lead',
                leads.summary.latestLeadCreatedAt ? formatDateTime(leads.summary.latestLeadCreatedAt) : 'No leads yet'
            )}
        </div>
        ${renderSettingsPanel(settings)}
        <div class="lead-list">
            ${leads.leads.length ? leads.leads.map(renderLeadCard).join('') : renderEmptyLeads()}
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
                    <p class="lead-title">${escapeHtml(lead.name || 'Unnamed lead')}</p>
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
                ${renderLeadBadge('Config', `v${lead.configVersionNumber}`)}
                ${renderLeadBadge('Size', lead.estimateInput?.size !== undefined ? String(lead.estimateInput.size) : 'N/A')}
                ${renderLeadBadge('Bulk', lead.estimateInput?.bulk === true ? 'Yes' : lead.estimateInput?.bulk === false ? 'No' : 'N/A')}
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
            <p class="empty-state__title">No leads yet</p>
            <p class="empty-state__copy">
                Submit a lead through the widget to see the first authenticated dashboard record appear here.
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
                        ${entry.isActive ? '<span class="history-item__active">Active</span>' : ''}
                    </li>
                `
              )
              .join('')
        : '<li class="history-item">No config history yet.</li>';

    return `
        <section class="settings-panel">
            <div class="settings-panel__header">
                <div>
                    <p class="card-label">Client Settings</p>
                    <h3>Onboarding and estimator config</h3>
                </div>
                <p class="surface-meta">Tenant ID: ${escapeHtml(settings.clientId)}</p>
            </div>
            <p class="surface-copy">
                Update company profile data and the pricing JSON that drives the estimator without changing the stable tenant ID.
            </p>
            <div class="settings-version-card">
                <p class="metric-label">Current Config Version</p>
                <p class="settings-version-card__value">v${escapeHtml(String(settings.currentConfigVersion.versionNumber))}</p>
                <p class="settings-version-card__meta">Activated ${escapeHtml(formatDateTime(settings.currentConfigVersion.createdAt))}</p>
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
                    <span class="field-label">Pricing Config JSON</span>
                    <textarea class="field-input field-input--multiline" name="estimatorConfig">${escapeHtml(estimatorConfigJson)}</textarea>
                </label>
                <button class="primary-button" type="submit">${state.portal.isSavingSettings ? 'Saving...' : 'Save Settings'}</button>
            </form>
            <div class="settings-history">
                <div class="settings-history__header">
                    <p class="card-label">Config History</p>
                    <p class="surface-meta">Recent immutable versions</p>
                </div>
                <ul class="history-list">
                    ${historyMarkup}
                </ul>
            </div>
        </section>
    `;
}

function wirePortalEvents() {
    const loginForm = document.getElementById('portal-login-form');

    if (loginForm instanceof HTMLFormElement) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(loginForm);
            const clientId = String(formData.get('clientId') ?? '').trim();
            const email = String(formData.get('email') ?? '').trim();
            const password = String(formData.get('password') ?? '');

            state.portal.status = 'signingIn';
            state.portal.errorMessage = null;
            renderApp();

            try {
                const login = await loginPortal({ clientId, email, password });
                storeSessionToken(login.token);
                state.portal.token = login.token;
                await loadPortalDashboard(login.token);
            } catch (error) {
                clearSessionToken();
                state.portal = {
                    status: 'error',
                    token: null,
                    session: null,
                    leads: null,
                    settings: null,
                    errorMessage: getErrorMessage(error, 'Unable to sign in to the client portal.'),
                    settingsMessage: null,
                    isSavingSettings: false
                };
                renderApp();
            }
        });
    }

    const refreshButton = document.getElementById('portal-refresh-button');

    if (refreshButton instanceof HTMLButtonElement) {
        refreshButton.addEventListener('click', async () => {
            const token = state.portal.token;

            if (!token) {
                return;
            }

            await loadPortalDashboard(token);
        });
    }

    const logoutButton = document.getElementById('portal-logout-button');

    if (logoutButton instanceof HTMLButtonElement) {
        logoutButton.addEventListener('click', async () => {
            const token = state.portal.token;

            try {
                if (token) {
                    await logoutPortal(token);
                }
            } catch {
                // Logging out should still clear the local session even if the network request fails.
            }

            clearSessionToken();
            state.portal = {
                status: 'signedOut',
                token: null,
                session: null,
                leads: null,
                settings: null,
                errorMessage: null,
                settingsMessage: null,
                isSavingSettings: false
            };
            renderApp();
        });
    }

    const settingsForm = document.getElementById('portal-settings-form');

    if (settingsForm instanceof HTMLFormElement) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const token = state.portal.token;
            const currentSettings = state.portal.settings;

            if (!token || !currentSettings) {
                return;
            }

            const formData = new FormData(settingsForm);
            const estimatorConfigText = String(formData.get('estimatorConfig') ?? '');

            let estimatorConfig: PortalClientSettings['estimatorConfig'];

            try {
                estimatorConfig = JSON.parse(estimatorConfigText) as PortalClientSettings['estimatorConfig'];
            } catch {
                state.portal.settingsMessage = null;
                state.portal.errorMessage = 'Pricing config JSON must be valid JSON.';
                renderApp();
                return;
            }

            state.portal.isSavingSettings = true;
            state.portal.errorMessage = null;
            state.portal.settingsMessage = null;
            renderApp();

            try {
                const updatedSettings = await updatePortalClientSettings(token, {
                    companyName: String(formData.get('companyName') ?? '').trim(),
                    logoUrl: normalizeOptionalValue(formData.get('logoUrl')),
                    phone: normalizeOptionalValue(formData.get('phone')),
                    notificationEmail: normalizeOptionalValue(formData.get('notificationEmail')),
                    estimatorConfig
                });

                state.portal.settings = updatedSettings;
                state.portal.isSavingSettings = false;
                state.portal.settingsMessage = 'Client settings saved.';
                renderApp();
            } catch (error) {
                state.portal.isSavingSettings = false;
                state.portal.errorMessage = getErrorMessage(error, 'Unable to save client settings.');
                renderApp();
            }
        });
    }
}

function ensureWidgetMounted() {
    const widgetHost = document.getElementById('widget-root');

    if (!(widgetHost instanceof HTMLElement)) {
        return;
    }

    if (currentWidgetHost === widgetHost) {
        return;
    }

    mountedWidget?.destroy();
    mountedWidget = mountWidget(widgetHost, demoConfig);
    currentWidgetHost = widgetHost;
}

function applyPortalBranding() {
    const branding = state.portal.session?.client.branding;

    rootElement.style.setProperty('--portal-accent', branding?.primaryColor ?? '#c2410c');
    rootElement.style.setProperty('--portal-accent-secondary', branding?.secondaryColor ?? '#0f766e');
    rootElement.style.setProperty('--portal-font-family', branding?.fontFamily ?? '"Avenir Next", "Segoe UI", sans-serif');
}

function storeSessionToken(token: string) {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
}

function loadSessionToken(): string | null {
    return localStorage.getItem(SESSION_STORAGE_KEY);
}

function clearSessionToken() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
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

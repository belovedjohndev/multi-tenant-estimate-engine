import { clearPortalAccessToken, persistPortalAccessToken, readPortalAccessToken } from './authSession';
import { portalConfig } from './portalConfig';
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
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
});

const state: AppState = {
    portal: {
        status: 'signedOut',
        token: readPortalAccessToken(),
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
        clearPortalAccessToken();
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
        <div class="portal-shell">
            <section class="portal-hero">
                <div class="portal-hero__copy">
                    <p class="eyebrow">Dedicated Portal</p>
                    <h1>${escapeHtml(portalConfig.portalTitle)}</h1>
                    <p class="hero-copy">
                        Login, lead review, client settings, pricing config editing, config version history, and logout now
                        live in a dedicated frontend app. The public estimator remains isolated in <code>demo-site</code>.
                    </p>
                </div>
                <div class="portal-hero__meta">
                    <span class="hero-pill">Authenticated operations</span>
                    <span class="hero-pill">Tenant-safe settings</span>
                    <span class="hero-pill">Prepared for cookie auth</span>
                </div>
            </section>
            ${renderPortalSurface()}
        </div>
    `;

    wirePortalEvents();
    applyPortalBranding();
}

function renderPortalSurface(): string {
    const { status, session, leads, settings, errorMessage } = state.portal;

    if (status === 'ready' && session && leads && settings) {
        return renderDashboard(session, leads, settings);
    }

    return `
        <section class="portal-surface">
            <div class="surface-card surface-card--auth">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Client Login</p>
                        <h2>Access the private dashboard</h2>
                    </div>
                    <p class="surface-meta">No backend contract changes</p>
                </div>
                <p class="surface-copy">
                    This frontend is the authenticated side of the SaaS product. Session storage is isolated behind a
                    dedicated auth module so the transport can later switch to HttpOnly cookies without a UI rewrite.
                </p>
                ${errorMessage ? `<p class="portal-feedback portal-feedback--error">${escapeHtml(errorMessage)}</p>` : ''}
                ${status === 'loading' || status === 'signingIn' ? renderPortalLoading(status) : renderLoginForm()}
            </div>
            <div class="surface-card surface-card--notes">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Portal Scope</p>
                        <h2>Everything client-only stays here</h2>
                    </div>
                </div>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>Dashboard</h3>
                        <p>Recent leads, totals, and activity history stay outside the public website.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Settings</h3>
                        <p>Company profile, notification email, and logo remain tenant-isolated.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Pricing control</h3>
                        <p>Pricing JSON and immutable config version history remain attached to the authenticated tenant.</p>
                    </div>
                </div>
            </div>
        </section>
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
                <input class="field-input" name="clientId" type="text" value="${escapeHtml(portalConfig.defaultClientId)}" autocomplete="organization" />
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
        <section class="dashboard-shell">
            <div class="surface-card dashboard-card">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Client Dashboard</p>
                        <h2>${escapeHtml(settings.companyName)}</h2>
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
            </div>
            <div class="surface-card lead-column">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Lead List</p>
                        <h2>Recent submissions</h2>
                    </div>
                    <p class="surface-meta">Config-aware history</p>
                </div>
                <div class="lead-list">
                    ${leads.leads.length ? leads.leads.map(renderLeadCard).join('') : renderEmptyLeads()}
                </div>
            </div>
        </section>
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
                Submit a lead through the public widget to see the first dashboard record appear here.
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
                    <h3>Profile, pricing, and config history</h3>
                </div>
                <p class="surface-meta">Tenant ID: ${escapeHtml(settings.clientId)}</p>
            </div>
            <p class="surface-copy">
                Update company profile data and the pricing JSON that drives the estimator while preserving the stable tenant slug.
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
                    <p class="card-label">Config Version History</p>
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
                persistPortalAccessToken(login.token);
                state.portal.token = login.token;
                await loadPortalDashboard(login.token);
            } catch (error) {
                clearPortalAccessToken();
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

            clearPortalAccessToken();
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

function applyPortalBranding() {
    const branding = state.portal.session?.client.branding;

    rootElement.style.setProperty('--portal-accent', branding?.primaryColor ?? '#b45309');
    rootElement.style.setProperty('--portal-accent-secondary', branding?.secondaryColor ?? '#0f766e');
    rootElement.style.setProperty('--portal-font-family', branding?.fontFamily ?? '"Avenir Next", "Segoe UI", sans-serif');
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

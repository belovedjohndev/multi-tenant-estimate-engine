import { PortalRoute } from '../router';
import { PortalState } from '../portalState';
import { escapeHtml } from '../shared/html';

interface PortalShellOptions {
    portal: PortalState;
    route: PortalRoute;
    content: string;
}

export function renderPortalShell(options: PortalShellOptions): string {
    const isAuthenticated = options.portal.status === 'ready' && options.portal.session !== null;

    return `
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
            ${
                isAuthenticated
                    ? `<div class="portal-app-layout">
                        ${renderPortalNavigation(options.portal, options.route)}
                        <main class="portal-main" id="portal-main">${options.content}</main>
                    </div>`
                    : options.content
            }
        </div>
    `;
}

function renderPortalNavigation(portal: PortalState, route: PortalRoute): string {
    const session = portal.session;
    const companyName = portal.settings?.companyName ?? session?.client.name ?? 'Portal';
    const userEmail = session?.user.email ?? '';

    return `
        <aside class="portal-nav" aria-label="Portal navigation">
            <div class="portal-nav__brand">
                <p class="card-label">Company Portal</p>
                <h2>${escapeHtml(companyName)}</h2>
                ${userEmail ? `<p>${escapeHtml(userEmail)}</p>` : ''}
            </div>
            <nav class="portal-nav__links">
                ${renderNavLink('/dashboard', 'Dashboard', route)}
                ${renderNavLink('/leads', 'Leads', route)}
                ${renderNavLink('/settings', 'Settings', route)}
            </nav>
            <button class="secondary-button portal-nav__signout" type="button" id="portal-logout-button">Sign Out</button>
        </aside>
    `;
}

function renderNavLink(route: PortalRoute, label: string, currentRoute: PortalRoute): string {
    return `
        <a class="portal-nav__link${currentRoute === route ? ' is-active' : ''}" href="${route}" ${
            currentRoute === route ? 'aria-current="page"' : ''
        }>
            ${escapeHtml(label)}
        </a>
    `;
}

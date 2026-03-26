import { mountWidget, MountedWidget } from '../../widget/src';
import { demoConfig } from './demoConfig';
import './styles.css';

type SitePath = '/' | '/pricing' | '/terms' | '/privacy' | '/refund';

interface CompliancePage {
    title: string;
    intro: string;
    sections: Array<{
        heading: string;
        paragraphs?: string[];
        bullets?: string[];
    }>;
}

const appRoot = document.getElementById('app-root');

if (!(appRoot instanceof HTMLElement)) {
    throw new Error('App root element #app-root was not found');
}

const rootElement: HTMLElement = appRoot;

let mountedWidget: MountedWidget | null = null;
let currentWidgetHost: HTMLElement | null = null;
const supportEmailPlaceholder = '[REPLACE WITH SUPPORT EMAIL BEFORE LAUNCH]';

const compliancePages: Record<Exclude<SitePath, '/'>, CompliancePage> = {
    '/pricing': {
        title: 'Pricing',
        intro: 'Estimate Engine keeps the offer simple so service businesses can launch website estimates quickly and manage incoming leads without extra setup overhead.',
        sections: [
            {
                heading: 'Estimate Engine',
                paragraphs: ['$49/month'],
                bullets: [
                    'Website estimate widget',
                    'Lead capture',
                    'Email notifications',
                    'Client dashboard',
                    'Pricing configuration',
                    'Cancel anytime'
                ]
            }
        ]
    },
    '/terms': {
        title: 'Terms of Service',
        intro: 'These terms govern access to Estimate Engine and apply to businesses using the software to provide online estimate and lead capture functionality.',
        sections: [
            {
                heading: 'Business Use',
                paragraphs: [
                    'Estimate Engine is provided for business and commercial use. You are responsible for how your business configures and presents the estimator to your customers.'
                ]
            },
            {
                heading: 'Service Scope',
                paragraphs: [
                    'The service provides online estimate generation, lead capture, notification delivery, and client portal management tools.'
                ]
            },
            {
                heading: 'Billing',
                paragraphs: [
                    'Subscriptions are billed monthly and may be canceled at any time. Cancellation stops future billing but does not automatically refund past charges except where a separate refund policy applies.'
                ]
            },
            {
                heading: 'Estimate Accuracy',
                paragraphs: [
                    'Estimate results depend on client-provided configuration and end-user input. We are not responsible for incorrect estimates caused by client configuration choices, incomplete setup, or inaccurate information entered by end users.'
                ]
            },
            {
                heading: 'Warranty Disclaimer',
                paragraphs: [
                    'The service is provided "as is" and "as available" without warranties of any kind, whether express or implied.'
                ]
            },
            {
                heading: 'Contact',
                paragraphs: [`Support email: ${supportEmailPlaceholder}`]
            }
        ]
    },
    '/privacy': {
        title: 'Privacy Policy',
        intro: 'This policy explains how Estimate Engine handles information submitted through the public estimator and lead capture experience.',
        sections: [
            {
                heading: 'Information We Collect',
                paragraphs: [
                    'We collect information submitted through estimate and lead forms, which may include name, email address, phone number, address, and estimate-related input.'
                ]
            },
            {
                heading: 'How Data Is Used',
                paragraphs: [
                    'Submitted data is stored securely and used to deliver estimate results, notify the client who owns the estimator, and support the normal operation of the service.'
                ]
            },
            {
                heading: 'Client Access',
                paragraphs: [
                    'Lead and estimate data is accessible only to the client account that owns the estimator experience receiving that submission, along with authorized service providers supporting the platform.'
                ]
            },
            {
                heading: 'Data Sales',
                paragraphs: ['We do not sell personal data.']
            },
            {
                heading: 'Contact',
                paragraphs: [`Support email: ${supportEmailPlaceholder}`]
            }
        ]
    },
    '/refund': {
        title: 'Refund Policy',
        intro: 'This refund policy applies to subscriptions for Estimate Engine.',
        sections: [
            {
                heading: 'New Subscriptions',
                paragraphs: ['New subscriptions are eligible for a refund within 7 days of the initial payment date.']
            },
            {
                heading: 'After 7 Days',
                paragraphs: ['After the 7-day period, payments are non-refundable.']
            },
            {
                heading: 'Cancellation',
                paragraphs: [
                    'Customers may cancel at any time to avoid future billing. Cancellation does not retroactively refund charges outside the 7-day refund period.'
                ]
            },
            {
                heading: 'Contact',
                paragraphs: [`Support email: ${supportEmailPlaceholder}`]
            }
        ]
    }
};

renderApp();

window.addEventListener('popstate', () => {
    renderApp();
});

function renderApp() {
    const currentPath = normalizePath(window.location.pathname);

    document.title = currentPath === '/' ? 'Estimate Engine Demo' : `Estimate Engine ${compliancePages[currentPath].title}`;
    rootElement.innerHTML = buildShellMarkup(currentPath);

    if (currentPath === '/') {
        ensureWidgetMounted();
        return;
    }

    destroyWidget();
}

function buildShellMarkup(pathname: SitePath): string {
    return `
        <div class="demo-shell">
            <header class="site-header">
                <a class="brand-mark" href="/">Estimate Engine</a>
                <nav class="site-nav" aria-label="Primary">
                    <a class="site-nav__link${pathname === '/' ? ' is-active' : ''}" href="/">Demo</a>
                    <a class="site-nav__link${pathname === '/pricing' ? ' is-active' : ''}" href="/pricing">Pricing</a>
                    <a class="site-nav__link${pathname === '/terms' ? ' is-active' : ''}" href="/terms">Terms</a>
                    <a class="site-nav__link${pathname === '/privacy' ? ' is-active' : ''}" href="/privacy">Privacy</a>
                    <a class="site-nav__link${pathname === '/refund' ? ' is-active' : ''}" href="/refund">Refund</a>
                </nav>
            </header>

            ${pathname === '/' ? buildHomeMarkup() : buildCompliancePageMarkup(pathname)}

            <footer class="site-footer">
                <div>
                    <p class="site-footer__title">Estimate Engine</p>
                    <p class="site-footer__copy">Instant website estimates, lead capture, and client operations for service businesses.</p>
                </div>
                <nav class="footer-nav" aria-label="Footer">
                    <a href="/pricing">Pricing</a>
                    <a href="/terms">Terms</a>
                    <a href="/privacy">Privacy</a>
                    <a href="/refund">Refund</a>
                </nav>
            </footer>
        </div>
    `;
}

function buildHomeMarkup(): string {
    return `
        <section class="hero">
            <div class="hero-copy-block">
                <p class="eyebrow">Estimate Engine SaaS</p>
                <h1>Public estimator demo for the lead capture side of the product.</h1>
                <p class="hero-copy">
                    This site is public-only. It showcases the embeddable estimator experience that a client would
                    place on their website while the authenticated operations surface lives in the separate portal app.
                </p>
                <div class="hero-pill-row">
                    <span class="hero-pill">Tenant: ${escapeHtml(demoConfig.clientId)}</span>
                    <span class="hero-pill">Public widget host</span>
                    <span class="hero-pill">Estimator + lead capture</span>
                </div>
            </div>
            <aside class="hero-note">
                <p class="card-label">Product Shape</p>
                <h2>Demo site stays public.</h2>
                <p class="surface-copy">
                    Client login, dashboard, settings, and config history live in the dedicated
                    <code>portal-site</code> frontend so this app can stay focused on conversion and lead intake.
                </p>
            </aside>
        </section>

        <section class="surface-grid">
            <article class="surface-card">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Estimator Demo</p>
                        <h2>Lead capture flow</h2>
                    </div>
                    <p class="surface-meta">Uses ${escapeHtml(demoConfig.clientId)} config</p>
                </div>
                <p class="surface-copy">
                    Prospects can calculate an estimate, submit contact details, and enter the production lead flow
                    without seeing any client-only portal controls.
                </p>
                <div class="widget-zone">
                    <div id="widget-root"></div>
                </div>
            </article>
            <article class="surface-card surface-card--guide">
                <div class="surface-header">
                    <div>
                        <p class="card-label">What Moved</p>
                        <h2>Client operations now live elsewhere</h2>
                    </div>
                </div>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>Portal authentication</h3>
                        <p>Dedicated sign-in now belongs to <code>portal-site</code>, not the public demo.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Lead dashboard</h3>
                        <p>Recent leads, estimate totals, and activity stay inside the authenticated app.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Client settings</h3>
                        <p>Company profile, notification email, pricing config, and config history are portal-only.</p>
                    </div>
                </div>
            </article>
        </section>
    `;
}

function buildCompliancePageMarkup(pathname: Exclude<SitePath, '/'>): string {
    const page = compliancePages[pathname];

    return `
        <section class="content-hero">
            <div class="content-hero__copy">
                <p class="eyebrow">Public Information</p>
                <h1>${escapeHtml(page.title)}</h1>
                <p class="hero-copy">${escapeHtml(page.intro)}</p>
            </div>
            <aside class="hero-note">
                <p class="card-label">Estimate Engine</p>
                <h2>Business-ready public information.</h2>
                <p class="surface-copy">
                    These pages are available on the public demo site to support customer review, onboarding, and payment processor compliance.
                </p>
            </aside>
        </section>

        <section class="content-layout">
            <article class="surface-card document-card">
                ${page.sections
                    .map(
                        (section) => `
                            <section class="document-section">
                                <h2>${escapeHtml(section.heading)}</h2>
                                ${(section.paragraphs ?? [])
                                    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
                                    .join('')}
                                ${
                                    section.bullets?.length
                                        ? `<ul class="document-list">
                                            ${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
                                        </ul>`
                                        : ''
                                }
                            </section>
                        `
                    )
                    .join('')}
            </article>

            ${
                pathname === '/pricing'
                    ? `
                        <aside class="surface-card cta-card">
                            <p class="card-label">Ready</p>
                            <h2>Ready to add instant estimates to your website?</h2>
                            <p class="surface-copy">
                                Launch a public estimator, capture leads automatically, and manage your pricing from the client portal.
                            </p>
                            <a class="cta-link" href="/">Get Started</a>
                        </aside>
                    `
                    : `
                        <aside class="surface-card cta-card">
                            <p class="card-label">Public Support</p>
                            <h2>Need a product overview first?</h2>
                            <p class="surface-copy">
                                Return to the public demo to see how the estimator experience appears to website visitors.
                            </p>
                            <a class="cta-link" href="/">View Demo</a>
                        </aside>
                    `
            }
        </section>
    `;
}

function ensureWidgetMounted() {
    const widgetHost = document.getElementById('widget-root');

    if (!(widgetHost instanceof HTMLElement)) {
        destroyWidget();
        return;
    }

    if (currentWidgetHost === widgetHost) {
        return;
    }

    mountedWidget?.destroy();
    mountedWidget = mountWidget(widgetHost, demoConfig);
    currentWidgetHost = widgetHost;
}

function destroyWidget() {
    mountedWidget?.destroy();
    mountedWidget = null;
    currentWidgetHost = null;
}

function normalizePath(pathname: string): SitePath {
    const normalizedPath = pathname.replace(/\/+$/, '') || '/';

    if (normalizedPath === '/pricing' || normalizedPath === '/terms' || normalizedPath === '/privacy' || normalizedPath === '/refund') {
        return normalizedPath;
    }

    return '/';
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

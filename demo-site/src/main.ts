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
const supportEmail = 'support@belovedjohndev.com';
const helloEmail = 'hello@belovedjohndev.com';
const billingEmail = 'billing@belovedjohndev.com';
const publicDemoEmail = 'demo@belovedjohn.com';
const portalEmail = 'portal@belovedjohndev.com';

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
            },
            {
                heading: 'Contact',
                paragraphs: [`General inquiries: ${helloEmail}`]
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
                paragraphs: [`Support email: ${supportEmail}`]
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
                paragraphs: [`Support email: ${supportEmail}`]
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
                paragraphs: [`Billing email: ${billingEmail}`]
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
                <h1>Public demo powered by the real embeddable widget.</h1>
                <p class="hero-copy">
                    This homepage is the public Estimate Engine demo for ${escapeHtml(publicDemoEmail)}, mounted from
                    the real TypeScript widget and backed by the live platform API.
                </p>
                <div class="hero-pill-row">
                    <span class="hero-pill">Tenant: ${escapeHtml(demoConfig.clientId)}</span>
                    <span class="hero-pill">API base: ${escapeHtml(demoConfig.apiBaseUrl)}</span>
                    <span class="hero-pill">Live API-backed widget</span>
                </div>
            </div>
            <aside class="hero-note">
                <p class="card-label">Product Split</p>
                <h2>Public demo, custom brand example, private portal.</h2>
                <p class="surface-copy">
                    Keep the public demo under Estimate Engine branding, use icthvac.com as the example of a
                    client-aligned instant-estimate experience, and keep operations inside the separate authenticated portal.
                </p>
            </aside>
        </section>

        <section class="surface-grid">
            <article class="surface-card">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Live Widget</p>
                        <h2>Actual product flow</h2>
                    </div>
                    <p class="surface-meta">Mounted from /widget/src</p>
                </div>
                <p class="surface-copy">
                    This card mounts the real widget implementation against the live API so the demo reflects the code
                    that actually ships with the platform.
                </p>
                <div class="widget-zone">
                    <div class="widget-preview-shell">
                        <div id="widget-root"></div>
                    </div>
                </div>
            </article>
            <article class="surface-card surface-card--guide">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Dedicated Portal</p>
                        <h2>Private client operations live here</h2>
                    </div>
                </div>
                <p class="surface-copy">
                    The screenshot fits best beside the live widget because it shows the other side of the product:
                    the public estimator demo comes from ${escapeHtml(publicDemoEmail)}, while the private portal for
                    ${escapeHtml(portalEmail)} handles authenticated client-only work.
                </p>
                <div class="portal-pill-row" aria-label="Portal context">
                    <span class="hero-pill">Public demo: ${escapeHtml(publicDemoEmail)}</span>
                    <span class="hero-pill">Portal: ${escapeHtml(portalEmail)}</span>
                    <span class="hero-pill">Custom instant-estimate example: icthvac.com</span>
                </div>
                <figure class="portal-shot">
                    <img
                        src="/portal/portal-belovedjohndev.png"
                        alt="Estimate Engine client portal login screen"
                    />
                </figure>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>Public side</h3>
                        <p>The left card remains the embeddable Estimate Engine demo that website visitors interact with first.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Private side</h3>
                        <p>This screenshot shows the authenticated portal where leads, pricing controls, and tenant settings stay isolated for the client.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Custom-brand example</h3>
                        <p>icthvac.com is the example of how the instant-estimate experience can be aligned to a customer brand without changing what the demo represents.</p>
                    </div>
                </div>
            </article>
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
                            <a class="cta-link" href="mailto:${escapeHtmlAttribute(helloEmail)}">Contact</a>
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

function escapeHtmlAttribute(value: string): string {
    return escapeHtml(value);
}

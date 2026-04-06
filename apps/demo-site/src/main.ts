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
const supportEmail = 'support@belovedjohndev.com';
const helloEmail = 'hello@belovedjohndev.com';
const billingEmail = 'billing@belovedjohndev.com';
const portalUrl = resolvePortalUrl();

const compliancePages: Record<Exclude<SitePath, '/'>, CompliancePage> = {
    '/pricing': {
        title: 'Pricing',
        intro: 'Estimate Engine keeps pricing simple so service businesses can launch website estimates quickly and manage incoming customer requests without extra setup overhead.',
        sections: [
            {
                heading: 'Estimate Engine',
                paragraphs: ['$49/month'],
                bullets: [
                    'Website estimate widget',
                    'Customer request capture',
                    'Email notifications',
                    'Private dashboard',
                    'Pricing settings',
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
        intro: 'These terms govern access to Estimate Engine and apply to businesses using the software to provide online estimate and request capture functionality.',
        sections: [
            {
                heading: 'Business Use',
                paragraphs: [
                    'Estimate Engine is provided for business and commercial use. You are responsible for how your business sets up and presents the estimate experience to your customers.'
                ]
            },
            {
                heading: 'Service Scope',
                paragraphs: [
                    'The service provides online estimate generation, request capture, notification delivery, and private dashboard management tools.'
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
                    'Estimate results depend on company pricing settings and customer input. We are not responsible for incorrect estimates caused by setup choices, incomplete pricing details, or inaccurate information entered by customers.'
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
        intro: 'This policy explains how Estimate Engine handles information submitted through the public estimate experience and request forms.',
        sections: [
            {
                heading: 'Information We Collect',
                paragraphs: [
                    'We collect information submitted through estimate and request forms, which may include name, email address, phone number, address, and estimate-related details.'
                ]
            },
            {
                heading: 'How Data Is Used',
                paragraphs: [
                    'Submitted data is stored securely and used to deliver estimate results, notify the company that owns the estimate experience, and support the normal operation of the service.'
                ]
            },
            {
                heading: 'Client Access',
                paragraphs: [
                    'Estimate requests and related details are accessible only to the company account that owns the estimate experience receiving that submission, along with authorized service providers supporting the platform.'
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

rootElement.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
        return;
    }

    const link = target.closest('a');

    if (!(link instanceof HTMLAnchorElement)) {
        return;
    }

    const href = link.getAttribute('href');

    if (!href || !isInternalSitePath(href)) {
        return;
    }

    event.preventDefault();
    navigateTo(href);
});

function renderApp() {
    const currentPath = normalizePath(window.location.pathname);

    document.title = currentPath === '/' ? 'Estimate Engine Demo' : `Estimate Engine ${compliancePages[currentPath].title}`;
    rootElement.innerHTML = buildShellMarkup(currentPath);
}

function buildShellMarkup(pathname: SitePath): string {
    return `
        <div class="demo-shell">
            <header class="site-header">
                <a class="brand-mark" href="/">Estimate Engine</a>
                <div class="site-header__actions">
                    <nav class="site-nav" aria-label="Primary">
                        <a class="site-nav__link${pathname === '/' ? ' is-active' : ''}" href="/">Demo</a>
                        <a class="site-nav__link${pathname === '/pricing' ? ' is-active' : ''}" href="/pricing">Pricing</a>
                        <a class="site-nav__link${pathname === '/terms' ? ' is-active' : ''}" href="/terms">Terms</a>
                        <a class="site-nav__link${pathname === '/privacy' ? ' is-active' : ''}" href="/privacy">Privacy</a>
                        <a class="site-nav__link${pathname === '/refund' ? ' is-active' : ''}" href="/refund">Refund</a>
                    </nav>
                    <a class="portal-link" href="${escapeHtmlAttribute(portalUrl)}">Open Portal</a>
                </div>
            </header>

            ${pathname === '/' ? buildHomeMarkup() : buildCompliancePageMarkup(pathname)}

            <footer class="site-footer">
                <div>
                    <p class="site-footer__title">Estimate Engine</p>
                    <p class="site-footer__copy">Website estimates, customer requests, and private dashboard tools for service businesses.</p>
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
                <p class="eyebrow">Estimate Engine Demo</p>
                <h1>See the website estimate experience in action.</h1>
                <p class="hero-copy">
                    This page shows the live estimate experience customers see on your website, using the same pricing
                    and request flow your business would use in production.
                </p>
                <div class="hero-pill-row">
                    <span class="hero-pill">Live website estimate</span>
                    <span class="hero-pill">Customer request flow</span>
                    <span class="hero-pill">Private dashboard available</span>
                </div>
            </div>
            <aside class="hero-note">
                <p class="card-label">How It Works</p>
                <h2>Public estimate experience, brand-ready setup, private dashboard.</h2>
                <p class="surface-copy">
                    Show the public estimate experience under Estimate Engine branding, preview how it can match a
                    customer's brand, and keep company management in a private dashboard.
                </p>
            </aside>
        </section>

        <section class="surface-grid">
            <article class="surface-card">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Estimate Experience</p>
                        <h2>See the customer journey</h2>
                    </div>
                    <p class="surface-meta">Live example</p>
                </div>
                <p class="surface-copy">
                    This is the live estimate flow a website visitor would use to review pricing and send a request.
                </p>
                <div class="widget-zone">
                    <div class="widget-preview-shell widget-preview-shell--placeholder">
                        <p class="card-label">Public Widget Preview</p>
                        <h3>Interactive widget preview is being finalized.</h3>
                        <p class="surface-copy">
                            Public pricing, privacy, refund, and access information remain available while the hosted widget preview is being prepared in this deployment.
                        </p>
                        <div class="hero-pill-row" aria-label="Widget preview status">
                            <span class="hero-pill">Public legal pages live</span>
                            <span class="hero-pill">Portal access available</span>
                            <span class="hero-pill">Hosted widget preview pending</span>
                        </div>
                    </div>
                </div>
            </article>
            <article class="surface-card surface-card--guide">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Private Dashboard</p>
                        <h2>Manage requests and company settings</h2>
                    </div>
                </div>
                <p class="surface-copy">
                    The screenshot shows the private side of the product: customers use the public estimate experience,
                    while your team signs in to review requests and update company settings.
                </p>
                <div class="portal-pill-row" aria-label="Portal context">
                    <span class="hero-pill">Public website view</span>
                    <span class="hero-pill">Private dashboard</span>
                    <span class="hero-pill">Brand-ready setup</span>
                </div>
                <figure class="portal-shot">
                    <img
                        src="/portal/portal-belovedjohndev.png"
                        alt="Estimate Engine private dashboard sign-in screen"
                    />
                </figure>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>Website experience</h3>
                        <p>Customers start here to review pricing and request an estimate from your business.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Company dashboard</h3>
                        <p>Review customer requests, update pricing settings, and manage company details in one place.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Brand-ready setup</h3>
                        <p>The estimate experience can be styled to match a customer's brand while keeping the same product workflow.</p>
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
                    These pages are available on the public site to support customer review, onboarding, and payment processor compliance.
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
                                Launch website estimates, capture customer requests automatically, and manage pricing from your private dashboard.
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

function navigateTo(pathname: SitePath): void {
    if (normalizePath(window.location.pathname) === pathname) {
        return;
    }

    window.history.pushState(window.history.state, '', pathname);
    renderApp();
}

function isInternalSitePath(value: string): value is SitePath {
    return value === '/' || value === '/pricing' || value === '/terms' || value === '/privacy' || value === '/refund';
}

function resolvePortalUrl(): string {
    const configuredValue = import.meta.env.VITE_PORTAL_URL;

    if (typeof configuredValue === 'string' && configuredValue.trim()) {
        return configuredValue.trim();
    }

    const { protocol, hostname } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:4174';
    }

    if (hostname === 'demo.belovedjohndev.com' || hostname === 'www.demo.belovedjohndev.com') {
        return `${protocol}//portal.belovedjohndev.com`;
    }

    const rootHostname = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    return `${protocol}//portal.${rootHostname}`;
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

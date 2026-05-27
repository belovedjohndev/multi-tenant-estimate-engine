import './styles.css';
import { demoConfig } from './demoConfig';

type SitePath = '/' | '/pricing' | '/terms' | '/privacy' | '/refund';
type EstimateComplexity = 'low' | 'medium' | 'high';

interface CompliancePage {
    title: string;
    intro: string;
    sections: Array<{
        heading: string;
        paragraphs?: string[];
        bullets?: string[];
    }>;
}

interface ApiSuccessEnvelope<T> {
    success: true;
    data: T;
}

interface ApiErrorEnvelope {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

interface ClientConfigData {
    branding: {
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        fontFamily?: string;
    } | null;
    config: {
        id: number;
        versionNumber: number;
        estimatorConfig: {
            basePrice: number;
            multipliers: {
                size: number;
                complexity: number;
            };
            discounts: {
                bulk: number;
            };
        };
    };
}

interface EstimateInput {
    size: number;
    complexity: EstimateComplexity;
    bulk: boolean;
}

interface EstimateResult {
    total: number;
    breakdown: {
        basePrice: number;
        sizeMultiplier: number;
        complexityMultiplier: number;
        discount: number;
    };
    configVersion: {
        id: number;
        versionNumber: number;
    };
}

interface LeadResponse {
    id: number;
}

const appRoot = document.getElementById('app-root');

if (!(appRoot instanceof HTMLElement)) {
    throw new Error('App root element #app-root was not found');
}

const rootElement: HTMLElement = appRoot;
const supportEmail = 'belovedjohn.dev@gmail.com';
const helloEmail = 'belovedjohn.dev@gmail.com';
const billingEmail = 'belovedjohn.dev@gmail.com';
const portalUrl = resolvePortalUrl();
let clientConfigPromise: Promise<ClientConfigData> | null = null;
let activeEstimateInput: EstimateInput | null = null;
let activeEstimateResult: EstimateResult | null = null;

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

    if (currentPath === '/') {
        initializeEstimateDemo();
    }
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
                <h1>Estimate requests from your website, ready for follow-up.</h1>
                <p class="hero-copy">
                    Give visitors a guided estimate flow, capture their contact details, and send every request into a private dashboard.
                </p>
                <div class="hero-context">
                    <span>Public estimator</span>
                    <span>Lead capture</span>
                    <span>Private follow-up queue</span>
                </div>
            </div>
            <aside class="hero-note">
                <p class="card-label">Workflow</p>
                <h2>What happens after a visitor starts?</h2>
                <ol class="workflow-list" aria-label="Estimate request workflow">
                    <li>They answer a few estimate questions.</li>
                    <li>Estimate Engine calculates a price snapshot from saved rules.</li>
                    <li>Contact details turn the estimate into a request.</li>
                    <li>The request appears in the private portal for follow-up.</li>
                </ol>
            </aside>
        </section>

        <section class="surface-grid">
            <article class="surface-card">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Estimate Experience</p>
                        <h2>Guided estimate flow</h2>
                    </div>
                    <p class="surface-meta">Live API flow</p>
                </div>
                <p class="surface-copy">
                    Customers enter project details, review a calculated estimate snapshot, then decide whether to send the request to your team.
                </p>
                <div class="widget-zone">
                    <div class="widget-preview-shell">
                        <section class="estimate-demo" aria-labelledby="estimate-demo-title">
                            <div class="estimate-demo__intro">
                                <p class="card-label">Step 1 - Estimate Details</p>
                                <h3 id="estimate-demo-title">Try the live estimate demo</h3>
                                <p class="surface-copy">
                                    Start with sample service details. The result uses the same public estimate endpoint as the embedded widget.
                                </p>
                                <p class="estimate-demo__config" id="estimate-config-status">Loading demo pricing...</p>
                            </div>

                            <form class="estimate-form" id="estimate-demo-form">
                                <label class="estimate-field">
                                    <span>Project size</span>
                                    <input type="number" name="size" min="1" step="1" value="1200" required />
                                </label>

                                <label class="estimate-field">
                                    <span>Complexity</span>
                                    <select name="complexity" required>
                                        <option value="low">Low</option>
                                        <option value="medium" selected>Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </label>

                                <label class="estimate-check">
                                    <input type="checkbox" name="bulk" checked />
                                    <span>Apply bulk discount</span>
                                </label>

                                <button class="cta-link estimate-submit" type="submit">Calculate Estimate</button>
                                <p class="estimate-form__status" id="estimate-demo-status" role="status" aria-live="polite"></p>
                            </form>

                            <div class="estimate-result" id="estimate-demo-result" aria-live="polite"></div>
                            <div class="lead-capture" id="estimate-demo-lead"></div>
                        </section>
                    </div>
                </div>
            </article>
            <article class="surface-card surface-card--guide">
                <div class="surface-header">
                    <div>
                        <p class="card-label">Private Dashboard</p>
                        <h2>New requests are ready for review</h2>
                    </div>
                </div>
                <p class="surface-copy">
                    After a visitor submits contact details, the request is stored for the tenant and appears in the
                    authenticated dashboard for review.
                </p>
                <div class="example-request-card" aria-label="Example request preview">
                    <div class="example-request-card__header">
                        <div>
                            <p class="card-label">Example Request</p>
                            <h3>Sarah Mitchell</h3>
                        </div>
                        <span class="status-pill status-pill--new">New request</span>
                    </div>
                    <dl class="request-detail-list">
                        <div>
                            <dt>Service</dt>
                            <dd>System replacement estimate</dd>
                        </div>
                        <div>
                            <dt>Estimate snapshot</dt>
                            <dd>$4,850</dd>
                        </div>
                        <div>
                            <dt>Source</dt>
                            <dd>Website estimate demo</dd>
                        </div>
                    </dl>
                </div>
                <figure class="portal-shot">
                    <img
                        src="/portal/portal-belovedjohndev.png"
                        alt="Estimate Engine private dashboard sign-in screen"
                    />
                </figure>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>Public estimate flow</h3>
                        <p>Visitors calculate a price and decide whether to send their contact details.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Tenant-scoped leads</h3>
                        <p>Submitted requests stay tied to the configured business account.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Configurable estimator</h3>
                        <p>Business users manage pricing inputs and saved configuration versions from the portal.</p>
                    </div>
                </div>
            </article>
        </section>
    `;
}

function initializeEstimateDemo(): void {
    const form = document.getElementById('estimate-demo-form');
    const status = document.getElementById('estimate-demo-status');
    const resultRegion = document.getElementById('estimate-demo-result');
    const leadRegion = document.getElementById('estimate-demo-lead');
    const configStatus = document.getElementById('estimate-config-status');

    if (
        !(form instanceof HTMLFormElement) ||
        !(status instanceof HTMLElement) ||
        !(resultRegion instanceof HTMLElement) ||
        !(leadRegion instanceof HTMLElement) ||
        !(configStatus instanceof HTMLElement)
    ) {
        return;
    }

    void ensureClientConfig()
        .then((config) => {
            configStatus.textContent = `Demo pricing loaded: base ${formatCurrency(config.config.estimatorConfig.basePrice)}.`;
        })
        .catch((error) => {
            configStatus.textContent = getErrorMessage(error, 'Demo pricing could not be loaded.');
        });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleEstimateSubmit(form, status, resultRegion, leadRegion);
    });
}

async function handleEstimateSubmit(
    form: HTMLFormElement,
    status: HTMLElement,
    resultRegion: HTMLElement,
    leadRegion: HTMLElement
): Promise<void> {
    status.textContent = '';
    resultRegion.innerHTML = '';
    leadRegion.innerHTML = '';
    setFormDisabled(form, true);

    try {
        const input = parseEstimateDemoInput(new FormData(form));
        status.textContent = 'Calculating estimate...';
        await ensureClientConfig();
        const result = await requestEstimate(input);

        activeEstimateInput = input;
        activeEstimateResult = result;
        status.textContent = '';
        resultRegion.innerHTML = buildEstimateResultMarkup(input, result);
        leadRegion.innerHTML = buildLeadCaptureMarkup(result);
        initializeLeadCaptureForm(leadRegion);
    } catch (error) {
        status.textContent = getErrorMessage(error, 'Estimate could not be calculated.');
    } finally {
        setFormDisabled(form, false);
    }
}

function initializeLeadCaptureForm(leadRegion: HTMLElement): void {
    const form = leadRegion.querySelector('#estimate-lead-form');
    const status = leadRegion.querySelector('#estimate-lead-status');

    if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
        return;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleLeadSubmit(form, status);
    });
}

async function handleLeadSubmit(form: HTMLFormElement, status: HTMLElement): Promise<void> {
    if (!activeEstimateInput || !activeEstimateResult) {
        status.textContent = 'Calculate an estimate before sending contact details.';
        return;
    }

    status.textContent = '';
    setFormDisabled(form, true);

    try {
        const formData = new FormData(form);
        const payload = {
            name: parseOptionalString(formData.get('name')),
            email: parseRequiredEmail(formData.get('email')),
            phone: parseOptionalString(formData.get('phone')),
            estimateInput: activeEstimateInput,
            estimateData: activeEstimateResult,
            configVersionId: activeEstimateResult.configVersion.id
        };
        const response = await requestApi<LeadResponse>(`${getDemoApiBaseUrl()}/leads`, {
            method: 'POST',
            body: JSON.stringify({
                clientId: demoConfig.clientId,
                ...payload
            })
        });

        form.innerHTML = `
            <div class="estimate-success">
                <p class="card-label">Request sent</p>
                <h4>Lead #${response.id} was created.</h4>
                <p class="surface-copy">The request used the public lead endpoint and is available to the tenant in the portal.</p>
                <a class="cta-link" href="${escapeHtmlAttribute(portalUrl)}">Open Portal</a>
            </div>
        `;
    } catch (error) {
        status.textContent = getErrorMessage(error, 'Contact details could not be submitted.');
        setFormDisabled(form, false);
    }
}

function buildEstimateResultMarkup(input: EstimateInput, result: EstimateResult): string {
    return `
        <article class="estimate-result-card">
            <div>
                <p class="card-label">Step 2 - Estimate Snapshot</p>
                <h4>${formatCurrency(result.total)}</h4>
                <p class="surface-copy">
                    ${input.size.toLocaleString()} sq ft, ${input.complexity} complexity, ${
                        input.bulk ? 'bulk discount applied' : 'standard pricing'
                    }.
                </p>
            </div>
            <dl class="estimate-breakdown">
                <div>
                    <dt>Base price</dt>
                    <dd>${formatCurrency(result.breakdown.basePrice)}</dd>
                </div>
                <div>
                    <dt>Size multiplier</dt>
                    <dd>${result.breakdown.sizeMultiplier.toFixed(2)}x</dd>
                </div>
                <div>
                    <dt>Complexity multiplier</dt>
                    <dd>${result.breakdown.complexityMultiplier.toFixed(2)}x</dd>
                </div>
                <div>
                    <dt>Discount</dt>
                    <dd>${(result.breakdown.discount * 100).toFixed(0)}%</dd>
                </div>
            </dl>
            <p class="estimate-version">Config version v${result.configVersion.versionNumber}</p>
        </article>
    `;
}

function buildLeadCaptureMarkup(result: EstimateResult): string {
    return `
        <form class="lead-form" id="estimate-lead-form">
            <div>
                <p class="card-label">Step 3 - Send Request To Dashboard</p>
                <h4>Send request to dashboard</h4>
                <p class="surface-copy">
                    Add contact details to create a demo request with this ${formatCurrency(result.total)} estimate snapshot.
                </p>
            </div>
            <label class="estimate-field">
                <span>Name</span>
                <input type="text" name="name" autocomplete="name" placeholder="Beloved John" />
            </label>
            <label class="estimate-field">
                <span>Email</span>
                <input type="email" name="email" autocomplete="email" placeholder="belovedjohn@example.com" required />
            </label>
            <label class="estimate-field">
                <span>Phone</span>
                <input type="tel" name="phone" autocomplete="tel" placeholder="+1 555 123 4567" />
            </label>
            <button class="cta-link estimate-submit" type="submit">Send request to dashboard</button>
            <a class="estimate-portal-cta" href="${escapeHtmlAttribute(portalUrl)}">Portal login or signup</a>
            <p class="estimate-form__status" id="estimate-lead-status" role="status" aria-live="polite"></p>
        </form>
    `;
}

async function ensureClientConfig(): Promise<ClientConfigData> {
    if (!clientConfigPromise) {
        const query = new URLSearchParams({ clientId: demoConfig.clientId });
        clientConfigPromise = requestApi<ClientConfigData>(`${getDemoApiBaseUrl()}/client-config?${query.toString()}`);
    }

    return clientConfigPromise;
}

async function requestEstimate(input: EstimateInput): Promise<EstimateResult> {
    return requestApi<EstimateResult>(`${getDemoApiBaseUrl()}/estimate`, {
        method: 'POST',
        body: JSON.stringify({
            clientId: demoConfig.clientId,
            input
        })
    });
}

function getDemoApiBaseUrl(): string {
    if (!demoConfig.apiBaseUrl) {
        throw new Error('VITE_API_BASE_URL must be configured for the live estimate demo.');
    }

    return demoConfig.apiBaseUrl;
}

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            Accept: 'application/json',
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            ...(init?.headers ?? {})
        }
    });
    const payload = (await response.json()) as ApiEnvelope<T>;

    if (response.ok && payload.success) {
        return payload.data;
    }

    if (!payload.success) {
        throw new Error(payload.error.message);
    }

    throw new Error('Unexpected API response');
}

function parseEstimateDemoInput(formData: FormData): EstimateInput {
    return {
        size: parsePositiveNumber(formData.get('size'), 'Project size'),
        complexity: parseEstimateComplexity(formData.get('complexity')),
        bulk: formData.get('bulk') === 'on'
    };
}

function parseEstimateComplexity(value: FormDataEntryValue | null): EstimateComplexity {
    if (value === 'low' || value === 'medium' || value === 'high') {
        return value;
    }

    throw new Error('Complexity must be low, medium, or high.');
}

function parsePositiveNumber(value: FormDataEntryValue | null, fieldName: string): number {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} is required.`);
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        throw new Error(`${fieldName} must be a positive number.`);
    }

    return parsedValue;
}

function parseRequiredEmail(value: FormDataEntryValue | null): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Email is required.');
    }

    const email = value.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Email must be a valid email address.');
    }

    return email;
}

function parseOptionalString(value: FormDataEntryValue | null): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue || undefined;
}

function setFormDisabled(form: HTMLFormElement, disabled: boolean): void {
    Array.from(form.elements).forEach((element) => {
        if ('disabled' in element) {
            element.disabled = disabled;
        }
    });
}

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
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

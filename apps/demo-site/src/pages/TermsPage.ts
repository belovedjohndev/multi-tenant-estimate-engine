import { escapeHtml } from '../shared/html';

const supportEmail = 'belovedjohn.dev@gmail.com';

export const termsPageTitle = 'Terms of Service';

export function renderTermsPage(): string {
    const sections = [
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
            heading: 'Paid Access',
            paragraphs: [
                'Paid access, if arranged, is handled directly during onboarding. Estimate Engine does not currently provide self-serve checkout in this MVP.'
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
            paragraphs: ['The service is provided "as is" and "as available" without warranties of any kind, whether express or implied.']
        },
        {
            heading: 'Contact',
            paragraphs: [`Support email: ${supportEmail}`]
        }
    ];

    return `
        <section class="content-hero">
            <div class="content-hero__copy">
                <p class="eyebrow">Public Information</p>
                <h1>Terms of Service</h1>
                <p class="hero-copy">These terms govern access to Estimate Engine and apply to businesses using the software to provide online estimate and request capture functionality.</p>
            </div>
            <aside class="hero-note">
                <p class="card-label">Estimate Engine</p>
                <h2>Business-ready public information.</h2>
                <p class="surface-copy">
                    These pages are available on the public site to support customer review, onboarding, and product evaluation.
                </p>
            </aside>
        </section>

        <section class="content-layout">
            <article class="surface-card document-card">
                ${sections
                    .map(
                        (section) => `
                            <section class="document-section">
                                <h2>${escapeHtml(section.heading)}</h2>
                                ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                            </section>
                        `
                    )
                    .join('')}
            </article>

            <aside class="surface-card cta-card">
                <p class="card-label">Public Support</p>
                <h2>Need a product overview first?</h2>
                <p class="surface-copy">
                    Return to the public demo to see how the estimator experience appears to website visitors.
                </p>
                <a class="cta-link" href="/">View Demo</a>
            </aside>
        </section>
    `;
}

import { escapeHtml } from '../shared/html';

const supportEmail = 'belovedjohn.dev@gmail.com';

export const refundPageTitle = 'Refund and Cancellation Policy';

export function renderRefundPage(): string {
    const sections = [
        {
            heading: 'Contact-Based Onboarding',
            paragraphs: [
                'Estimate Engine does not currently provide self-serve checkout in this MVP. Paid access, if arranged, is handled directly during onboarding.'
            ]
        },
        {
            heading: 'Refund Terms',
            paragraphs: [
                'Any refund or cancellation terms are confirmed before paid access begins. If no paid access has been arranged, no refund process applies.'
            ]
        },
        {
            heading: 'Cancellation',
            paragraphs: [
                'Customers may stop using the service or request cancellation according to the terms confirmed during onboarding.'
            ]
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
                <h1>Refund and Cancellation Policy</h1>
                <p class="hero-copy">This policy explains how refund or cancellation terms are handled when paid access is arranged directly.</p>
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

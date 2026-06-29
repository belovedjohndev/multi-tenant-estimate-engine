import { escapeHtml, escapeHtmlAttribute } from '../shared/html';

const helloEmail = 'belovedjohn.dev@gmail.com';

export const pricingPageTitle = 'Pricing';

export function renderPricingPage(): string {
    const sections = [
        {
            heading: 'Contact-based onboarding',
            paragraphs: [
                '$49/month',
                'No self-serve checkout is active in this MVP.',
                'Paid access, if arranged, is handled directly during onboarding.'
            ],
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
    ];

    return `
        <section class="content-hero">
            <div class="content-hero__copy">
                <p class="eyebrow">Public Information</p>
                <h1>Pricing</h1>
                <p class="hero-copy">Estimate Engine keeps pricing simple so service businesses can launch website estimates quickly and manage incoming customer requests without extra setup overhead.</p>
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

            <aside class="surface-card cta-card">
                <p class="card-label">Ready</p>
                <h2>Ready to add instant estimates to your website?</h2>
                <p class="surface-copy">
                    Launch website estimates, capture customer requests automatically, and manage pricing from your private dashboard.
                </p>
                <a class="cta-link" href="mailto:${escapeHtmlAttribute(helloEmail)}">Contact</a>
            </aside>
        </section>
    `;
}

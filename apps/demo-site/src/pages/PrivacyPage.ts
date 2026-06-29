import { escapeHtml } from '../shared/html';

const supportEmail = 'belovedjohn.dev@gmail.com';

export const privacyPageTitle = 'Privacy Policy';

export function renderPrivacyPage(): string {
    const sections = [
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
    ];

    return `
        <section class="content-hero">
            <div class="content-hero__copy">
                <p class="eyebrow">Public Information</p>
                <h1>Privacy Policy</h1>
                <p class="hero-copy">This policy explains how Estimate Engine handles information submitted through the public estimate experience and request forms.</p>
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

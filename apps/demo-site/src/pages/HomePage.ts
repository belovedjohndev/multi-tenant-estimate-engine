import { buildEstimateDemoMarkup } from '../features/estimate-demo/estimateDemoMarkup';

export function renderHomePage(): string {
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
                        ${buildEstimateDemoMarkup()}
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

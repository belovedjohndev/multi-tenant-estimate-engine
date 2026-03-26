import { mountWidget, MountedWidget } from '../../widget/src';
import { demoConfig } from './demoConfig';
import './styles.css';

const appRoot = document.getElementById('app-root');

if (!(appRoot instanceof HTMLElement)) {
    throw new Error('App root element #app-root was not found');
}

const rootElement: HTMLElement = appRoot;

let mountedWidget: MountedWidget | null = null;
let currentWidgetHost: HTMLElement | null = null;

renderApp();

function renderApp() {
    rootElement.innerHTML = `
        <div class="demo-shell">
            <section class="hero">
                <div class="hero-copy-block">
                    <p class="eyebrow">Estimate Engine SaaS</p>
                    <h1>Public estimator demo for the lead capture side of the product.</h1>
                    <p class="hero-copy">
                        This site is now public-only. It showcases the embeddable estimator experience that a client would
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
                        Client login, dashboard, settings, and config history have moved into the dedicated
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
        </div>
    `;

    ensureWidgetMounted();
}

function ensureWidgetMounted() {
    const widgetHost = document.getElementById('widget-root');

    if (!(widgetHost instanceof HTMLElement)) {
        return;
    }

    if (currentWidgetHost === widgetHost) {
        return;
    }

    mountedWidget?.destroy();
    mountedWidget = mountWidget(widgetHost, demoConfig);
    currentWidgetHost = widgetHost;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

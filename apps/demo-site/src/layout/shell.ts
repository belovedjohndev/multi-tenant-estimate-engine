import { SitePath } from '../router';
import { escapeHtmlAttribute } from '../shared/html';

interface ShellInput {
    pathname: SitePath;
    portalUrl: string;
    content: string;
}

export function buildShellMarkup(input: ShellInput): string {
    const { pathname, portalUrl, content } = input;

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

            ${content}

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

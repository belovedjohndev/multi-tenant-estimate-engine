import './styles.css';
import { demoConfig } from './demoConfig';
import { initializeEstimateDemo } from './features/estimate-demo/estimateDemo';
import { buildShellMarkup } from './layout/shell';
import { renderHomePage } from './pages/HomePage';
import { pricingPageTitle, renderPricingPage } from './pages/PricingPage';
import { privacyPageTitle, renderPrivacyPage } from './pages/PrivacyPage';
import { refundPageTitle, renderRefundPage } from './pages/RefundPage';
import { renderTermsPage, termsPageTitle } from './pages/TermsPage';
import { createRouter, SitePath } from './router';

interface RouteDefinition {
    title: string;
    render: () => string;
    afterRender?: () => void;
}

const appRoot = document.getElementById('app-root');

if (!(appRoot instanceof HTMLElement)) {
    throw new Error('App root element #app-root was not found');
}

const rootElement: HTMLElement = appRoot;
const portalUrl = resolvePortalUrl();

const routes: Record<SitePath, RouteDefinition> = {
    '/': {
        title: 'Estimate Engine Demo',
        render: renderHomePage,
        afterRender: () => {
            initializeEstimateDemo({
                apiBaseUrl: demoConfig.apiBaseUrl,
                clientId: demoConfig.clientId,
                portalUrl
            });
        }
    },
    '/pricing': {
        title: `Estimate Engine ${pricingPageTitle}`,
        render: renderPricingPage
    },
    '/terms': {
        title: `Estimate Engine ${termsPageTitle}`,
        render: renderTermsPage
    },
    '/privacy': {
        title: `Estimate Engine ${privacyPageTitle}`,
        render: renderPrivacyPage
    },
    '/refund': {
        title: `Estimate Engine ${refundPageTitle}`,
        render: renderRefundPage
    }
};

const router = createRouter({
    onRouteChange: renderApp
});

router.bindLinkHandling(rootElement);
renderApp();

function renderApp(): void {
    const currentPath = router.getCurrentPath();
    const route = routes[currentPath];

    document.title = route.title;
    rootElement.innerHTML = buildShellMarkup({
        pathname: currentPath,
        portalUrl,
        content: route.render()
    });
    route.afterRender?.();
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

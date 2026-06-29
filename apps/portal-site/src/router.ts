export type PortalRoute = '/' | '/login' | '/signup' | '/dashboard' | '/leads' | '/settings';

const supportedRoutes: PortalRoute[] = ['/', '/login', '/signup', '/dashboard', '/leads', '/settings'];

interface RouterOptions {
    onRouteChange: (route: PortalRoute) => void;
}

export interface PortalRouter {
    getRoute: () => PortalRoute;
    navigate: (route: PortalRoute) => void;
    replace: (route: PortalRoute) => void;
    bindLinkHandling: (rootElement: HTMLElement) => void;
}

export function createPortalRouter(options: RouterOptions): PortalRouter {
    function setRoute(route: PortalRoute, mode: 'push' | 'replace'): void {
        const currentRoute = getRoute();

        if (currentRoute === route) {
            options.onRouteChange(route);
            return;
        }

        if (mode === 'push') {
            window.history.pushState({}, '', route);
        } else {
            window.history.replaceState({}, '', route);
        }

        options.onRouteChange(route);
    }

    function getRoute(): PortalRoute {
        return normalizePortalRoute(window.location.pathname);
    }

    window.addEventListener('popstate', () => {
        options.onRouteChange(getRoute());
    });

    return {
        getRoute,
        navigate(route) {
            setRoute(route, 'push');
        },
        replace(route) {
            setRoute(route, 'replace');
        },
        bindLinkHandling(rootElement) {
            rootElement.addEventListener('click', (event) => {
                const target = event.target;

                if (!(target instanceof Element)) {
                    return;
                }

                const link = target.closest('a');

                if (!(link instanceof HTMLAnchorElement)) {
                    return;
                }

                const url = new URL(link.href);

                if (url.origin !== window.location.origin || link.target || link.hasAttribute('download')) {
                    return;
                }

                const route = normalizePortalRoute(url.pathname);

                if (!supportedRoutes.includes(route)) {
                    return;
                }

                event.preventDefault();
                setRoute(route, 'push');
            });
        }
    };
}

export function normalizePortalRoute(pathname: string): PortalRoute {
    const normalizedPath = pathname.trim().replace(/\/+$/, '') || '/';

    return isPortalRoute(normalizedPath) ? normalizedPath : '/';
}

export function isProtectedRoute(route: PortalRoute): boolean {
    return route === '/dashboard' || route === '/leads' || route === '/settings';
}

function isPortalRoute(value: string): value is PortalRoute {
    return supportedRoutes.includes(value as PortalRoute);
}

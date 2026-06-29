export type SitePath = '/' | '/pricing' | '/terms' | '/privacy' | '/refund';

interface RouterOptions {
    onRouteChange: () => void;
}

export function createRouter(options: RouterOptions) {
    window.addEventListener('popstate', () => {
        options.onRouteChange();
    });

    return {
        getCurrentPath(): SitePath {
            return normalizePath(window.location.pathname);
        },

        navigateTo(pathname: SitePath): void {
            if (normalizePath(window.location.pathname) === pathname) {
                return;
            }

            window.history.pushState(window.history.state, '', pathname);
            options.onRouteChange();
        },

        bindLinkHandling(rootElement: HTMLElement): void {
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
                this.navigateTo(href);
            });
        }
    };
}

export function normalizePath(pathname: string): SitePath {
    const normalizedPath = pathname.replace(/\/+$/, '') || '/';

    if (
        normalizedPath === '/pricing' ||
        normalizedPath === '/terms' ||
        normalizedPath === '/privacy' ||
        normalizedPath === '/refund'
    ) {
        return normalizedPath;
    }

    return '/';
}

export function isInternalSitePath(value: string): value is SitePath {
    return value === '/' || value === '/pricing' || value === '/terms' || value === '/privacy' || value === '/refund';
}

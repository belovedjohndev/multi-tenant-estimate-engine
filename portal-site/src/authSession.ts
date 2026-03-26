const SESSION_STORAGE_KEY = 'estimate-engine.portal.session-token';

// Temporary bearer-token persistence for the split portal app.
// Keeping this isolated in one module makes the later switch to HttpOnly cookie auth a transport change instead of a UI rewrite.
export function readPortalAccessToken(): string | null {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

export function persistPortalAccessToken(token: string): void {
    sessionStorage.setItem(SESSION_STORAGE_KEY, token);
}

export function clearPortalAccessToken(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

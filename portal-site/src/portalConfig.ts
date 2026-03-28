const apiBaseUrl = readRequiredEnv('VITE_API_BASE_URL');

export const portalConfig = {
    apiBaseUrl,
    defaultClientId: readOptionalEnv('VITE_DEFAULT_CLIENT_ID') || 'demo',
    portalTitle: readOptionalEnv('VITE_PORTAL_TITLE') || 'Estimate Engine Private Dashboard',
    demoAccess: {
        email: readOptionalEnv('VITE_DEMO_ACCESS_EMAIL') || 'owner@example.com',
        password: readOptionalEnv('VITE_DEMO_ACCESS_PASSWORD') || 'owner@example'
    }
};

function readRequiredEnv(key: 'VITE_API_BASE_URL'): string {
    const value = readOptionalEnv(key);

    if (!value) {
        throw new Error(`${key} must be set before starting the portal-site`);
    }

    return value;
}

function readOptionalEnv(
    key: 'VITE_API_BASE_URL' | 'VITE_DEFAULT_CLIENT_ID' | 'VITE_PORTAL_TITLE' | 'VITE_DEMO_ACCESS_EMAIL' | 'VITE_DEMO_ACCESS_PASSWORD'
): string | undefined {
    const value = import.meta.env[key];

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue || undefined;
}

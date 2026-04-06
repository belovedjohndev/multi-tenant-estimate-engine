interface WidgetRuntimeConfigInput {
    apiBaseUrl: string;
    clientId: string;
    launcherLabel: string;
    modalTitle: string;
    companyName: string;
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
}

const apiBaseUrl = readRequiredEnv('VITE_API_BASE_URL');

export const demoConfig: WidgetRuntimeConfigInput = {
    apiBaseUrl,
    clientId: readOptionalEnv('VITE_CLIENT_ID') || 'demo',
    launcherLabel: readOptionalEnv('VITE_LAUNCHER_LABEL') || 'Try The Live Widget',
    modalTitle: readOptionalEnv('VITE_MODAL_TITLE') || 'Estimate Engine Demo',
    companyName: readOptionalEnv('VITE_COMPANY_NAME') || 'Estimate Engine',
    logoUrl: readOptionalEnv('VITE_LOGO_URL') || '/brand/widget-demo-logo.png',
    primaryColor: readOptionalEnv('VITE_PRIMARY_COLOR') || '#0f3554',
    secondaryColor: readOptionalEnv('VITE_SECONDARY_COLOR') || '#2ea8ff'
};

function readRequiredEnv(key: 'VITE_API_BASE_URL'): string {
    const value = readOptionalEnv(key);

    if (!value) {
        throw new Error(`${key} must be set before starting the demo-site`);
    }

    return value;
}

function readOptionalEnv(
    key:
        | 'VITE_API_BASE_URL'
        | 'VITE_CLIENT_ID'
        | 'VITE_LAUNCHER_LABEL'
        | 'VITE_MODAL_TITLE'
        | 'VITE_COMPANY_NAME'
        | 'VITE_LOGO_URL'
        | 'VITE_PRIMARY_COLOR'
        | 'VITE_SECONDARY_COLOR'
): string | undefined {
    const value = import.meta.env[key];

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue || undefined;
}

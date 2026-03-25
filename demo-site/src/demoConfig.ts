import { WidgetRuntimeConfigInput } from '../../widget/src';

const apiBaseUrl = readRequiredEnv('VITE_API_BASE_URL');

export const demoConfig: WidgetRuntimeConfigInput = {
    apiBaseUrl,
    clientId: readOptionalEnv('VITE_CLIENT_ID') || 'demo',
    launcherLabel: readOptionalEnv('VITE_LAUNCHER_LABEL') || 'Launch Demo Widget',
    modalTitle: readOptionalEnv('VITE_MODAL_TITLE') || 'Owned Estimate Demo'
};

function readRequiredEnv(key: 'VITE_API_BASE_URL'): string {
    const value = readOptionalEnv(key);

    if (!value) {
        throw new Error(`${key} must be set before starting the demo-site`);
    }

    return value;
}

function readOptionalEnv(
    key: 'VITE_API_BASE_URL' | 'VITE_CLIENT_ID' | 'VITE_LAUNCHER_LABEL' | 'VITE_MODAL_TITLE'
): string | undefined {
    const value = import.meta.env[key];

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue || undefined;
}

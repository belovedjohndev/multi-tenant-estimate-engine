import { assertNonEmptyString, normalizeApiBaseUrl } from '../utils/validation';

export interface WidgetRuntimeConfigInput {
    apiBaseUrl: string;
    clientId: string;
    launcherLabel?: string;
    modalTitle?: string;
}

export interface WidgetRuntimeConfig {
    apiBaseUrl: string;
    clientId: string;
    launcherLabel: string;
    modalTitle: string;
}

export function parseRuntimeConfig(input: WidgetRuntimeConfigInput): WidgetRuntimeConfig {
    return {
        apiBaseUrl: normalizeApiBaseUrl(assertNonEmptyString(input.apiBaseUrl, 'apiBaseUrl')),
        clientId: assertNonEmptyString(input.clientId, 'clientId'),
        launcherLabel: input.launcherLabel?.trim() || 'Open Estimator',
        modalTitle: input.modalTitle?.trim() || 'Project Estimate'
    };
}

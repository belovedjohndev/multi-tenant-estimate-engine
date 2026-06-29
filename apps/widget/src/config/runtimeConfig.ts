import { assertNonEmptyString, normalizeApiBaseUrl } from '../utils/validation';

export interface WidgetRuntimeConfigInput {
    apiBaseUrl: string;
    clientId: string;
    launcherLabel?: string;
    modalTitle?: string;
    companyName?: string;
    phone?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
}

export interface WidgetRuntimeConfig {
    apiBaseUrl: string;
    clientId: string;
    launcherLabel: string;
    modalTitle: string;
    companyName?: string;
    phone?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
}

export function parseRuntimeConfig(input: WidgetRuntimeConfigInput): WidgetRuntimeConfig {
    return {
        apiBaseUrl: normalizeApiBaseUrl(assertNonEmptyString(input.apiBaseUrl, 'apiBaseUrl')),
        clientId: assertNonEmptyString(input.clientId, 'clientId'),
        launcherLabel: input.launcherLabel?.trim() || 'Open Estimator',
        modalTitle: input.modalTitle?.trim() || 'Project Estimate',
        companyName: input.companyName?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        logoUrl: input.logoUrl?.trim() || undefined,
        primaryColor: input.primaryColor?.trim() || undefined,
        secondaryColor: input.secondaryColor?.trim() || undefined
    };
}

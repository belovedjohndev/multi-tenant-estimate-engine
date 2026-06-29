import { portalConfig } from './portalConfig';
import { PortalBillingSummary, PortalClientSettings, PortalLeadsResponse, PortalSession } from './portalTypes';

export type PortalStatus = 'signedOut' | 'loading' | 'signingIn' | 'signingUp' | 'ready' | 'error';
export type AuthMode = 'login' | 'signup';
export type DemoAccessField = 'clientId' | 'email' | 'password';
export type PortalBillingStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PortalState {
    status: PortalStatus;
    authMode: AuthMode;
    session: PortalSession | null;
    leads: PortalLeadsResponse | null;
    settings: PortalClientSettings | null;
    billing: {
        status: PortalBillingStatus;
        summary: PortalBillingSummary | null;
        errorMessage: string | null;
    };
    errorMessage: string | null;
    settingsMessage: string | null;
    isSavingSettings: boolean;
    isResettingDemo: boolean;
    isResetDialogOpen: boolean;
    loginForm: {
        clientId: string;
        email: string;
        password: string;
        showPassword: boolean;
    };
    signupForm: {
        companyName: string;
        clientId: string;
        fullName: string;
        email: string;
        phone: string;
        password: string;
        confirmPassword: string;
        showPassword: boolean;
    };
}

export interface AppState {
    portal: PortalState;
}

export const state: AppState = {
    portal: createSignedOutPortalState(resolveInitialAuthMode(window.location.pathname))
};

export function createSignedOutPortalState(authMode: AuthMode): PortalState {
    return {
        status: 'signedOut',
        authMode,
        session: null,
        leads: null,
        settings: null,
        billing: {
            status: 'idle',
            summary: null,
            errorMessage: null
        },
        errorMessage: null,
        settingsMessage: null,
        isSavingSettings: false,
        isResettingDemo: false,
        isResetDialogOpen: false,
        loginForm: {
            clientId: portalConfig.defaultClientId,
            email: '',
            password: '',
            showPassword: false
        },
        signupForm: createInitialSignupForm()
    };
}

export function createInitialSignupForm(overrides?: Partial<PortalState['signupForm']>): PortalState['signupForm'] {
    const form: PortalState['signupForm'] = {
        companyName: '',
        clientId: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        showPassword: false
    };

    if (overrides) {
        Object.assign(form, overrides);
    }

    form.clientId = getSignupPrefillClientId(overrides?.clientId);
    form.password = '';
    form.confirmPassword = '';
    form.showPassword = false;

    return form;
}

export function getSignupPrefillClientId(value: string | undefined): string {
    if (!value) {
        return '';
    }

    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue || normalizedValue === portalConfig.defaultClientId.trim().toLowerCase()) {
        return '';
    }

    return value;
}

export function resolveInitialAuthMode(pathname: string): AuthMode {
    return normalizePortalPath(pathname) === '/signup' ? 'signup' : 'login';
}

export function normalizePortalPath(pathname: string): string {
    const normalizedPath = pathname.trim().replace(/\/+$/, '');

    return normalizedPath || '/';
}

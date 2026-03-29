import { portalConfig } from './portalConfig';
import {
    ApiErrorResponse,
    PortalClientSettings,
    PortalLeadsResponse,
    PortalLoginResponse,
    PortalSession
} from './portalTypes';

interface ApiSuccessEnvelope<T> {
    success: true;
    data: T;
}

interface ApiFailureEnvelope {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiFailureEnvelope;

interface PortalApiRequestInit {
    method: 'GET' | 'POST' | 'PUT';
    body?: string;
    headers?: Record<string, string>;
}

export async function loginPortal(input: {
    clientId: string;
    email: string;
    password: string;
}): Promise<PortalLoginResponse> {
    return requestPortalApi<PortalLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input)
    });
}

export async function signupPortal(input: {
    clientId: string;
    companyName: string;
    fullName: string;
    email: string;
    password: string;
    phone?: string;
}): Promise<PortalLoginResponse> {
    return requestPortalApi<PortalLoginResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(input)
    });
}

export async function fetchPortalSession(): Promise<PortalSession> {
    return requestPortalApi<PortalSession>('/auth/me', {
        method: 'GET'
    });
}

export async function fetchPortalLeads(limit = 25): Promise<PortalLeadsResponse> {
    return requestPortalApi<PortalLeadsResponse>(`/me/leads?limit=${encodeURIComponent(String(limit))}`, {
        method: 'GET'
    });
}

export async function fetchPortalClientSettings(): Promise<PortalClientSettings> {
    return requestPortalApi<PortalClientSettings>('/portal/client', {
        method: 'GET'
    });
}

export async function updatePortalClientSettings(
    input: Omit<PortalClientSettings, 'clientId' | 'currentConfigVersion' | 'configHistory'>
): Promise<PortalClientSettings> {
    return requestPortalApi<PortalClientSettings>('/portal/client', {
        method: 'PUT',
        body: JSON.stringify(input)
    });
}

export async function logoutPortal(): Promise<void> {
    await requestPortalApi('/auth/logout', {
        method: 'POST'
    });
}

export async function resetPortalDemo(): Promise<{
    reset: true;
    clientId: string;
    clearedLeadCount: number;
    removedConfigVersionCount: number;
}> {
    return requestPortalApi('/portal/demo/reset', {
        method: 'POST'
    });
}

async function requestPortalApi<T>(
    path: string,
    init: PortalApiRequestInit
): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`${portalConfig.apiBaseUrl}${path}`, {
            method: init.method,
            body: init.body,
            cache: 'no-store',
            credentials: 'include',
            headers: buildPortalHeaders(init)
        });
    } catch {
        throw createPortalApiError(
            'network_error',
            'Unable to reach the dashboard API. Please try again.',
            0
        );
    }

    const payload = (await readApiEnvelope<T>(response)) ?? {
        success: false as const,
        error: {
            code: 'invalid_api_response',
            message: 'Unexpected API response'
        }
    };

    if (!response.ok || !payload.success) {
        const errorPayload = (!payload.success ? payload.error : null) ?? {
            code: 'unknown_error',
            message: 'Unexpected API response'
        };

        throw createPortalApiError(errorPayload.code, errorPayload.message, response.status);
    }

    return payload.data;
}

function buildPortalHeaders(init: PortalApiRequestInit): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...init.headers
    };

    if (init.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

async function readApiEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
    const responseText = await response.text();

    if (!responseText) {
        return null;
    }

    try {
        return JSON.parse(responseText) as ApiEnvelope<T>;
    } catch {
        return null;
    }
}

function createPortalApiError(code: string, message: string, statusCode: number): Error & ApiErrorResponse {
    const error = new Error(message) as Error & ApiErrorResponse;
    error.code = code;
    error.message = message;
    error.statusCode = statusCode;
    return error;
}

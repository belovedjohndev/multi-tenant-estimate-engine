import { demoConfig } from './demoConfig';
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

export async function fetchPortalSession(token: string): Promise<PortalSession> {
    return requestPortalApi<PortalSession>('/auth/me', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

export async function fetchPortalLeads(token: string, limit = 25): Promise<PortalLeadsResponse> {
    return requestPortalApi<PortalLeadsResponse>(`/me/leads?limit=${encodeURIComponent(String(limit))}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

export async function fetchPortalClientSettings(token: string): Promise<PortalClientSettings> {
    return requestPortalApi<PortalClientSettings>('/portal/client', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

export async function updatePortalClientSettings(
    token: string,
    input: Omit<PortalClientSettings, 'clientId'>
): Promise<PortalClientSettings> {
    return requestPortalApi<PortalClientSettings>('/portal/client', {
        method: 'PUT',
        body: JSON.stringify(input),
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

export async function logoutPortal(token: string): Promise<void> {
    await requestPortalApi('/auth/logout', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

async function requestPortalApi<T>(
    path: string,
    init: {
        method: 'GET' | 'POST' | 'PUT';
        body?: string;
        headers?: Record<string, string>;
    }
): Promise<T> {
    const response = await fetch(`${demoConfig.apiBaseUrl}${path}`, {
        method: init.method,
        body: init.body,
        headers: {
            'Content-Type': 'application/json',
            ...init.headers
        }
    });

    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || !payload.success) {
        const errorPayload = (!payload.success ? payload.error : null) ?? {
            code: 'unknown_error',
            message: 'Unexpected API response'
        };

        const error = new Error(errorPayload.message) as Error & ApiErrorResponse;
        error.code = errorPayload.code;
        error.message = errorPayload.message;
        error.statusCode = response.status;
        throw error;
    }

    return payload.data;
}

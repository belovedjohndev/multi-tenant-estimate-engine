import { WidgetRuntimeConfig } from '../config/runtimeConfig';
import { ApiEnvelope, WidgetApiError, WidgetClientConfigData } from '../domain/estimatorTypes';

export class ApiClientError extends Error implements WidgetApiError {
    constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string
    ) {
        super(message);
        this.name = 'ApiClientError';
    }
}

export async function fetchClientConfig(config: WidgetRuntimeConfig): Promise<WidgetClientConfigData> {
    const query = new URLSearchParams({ clientId: config.clientId });

    return requestApi<WidgetClientConfigData>(`${config.apiBaseUrl}/client-config?${query.toString()}`);
}

export async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            Accept: 'application/json',
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            ...(init?.headers ?? {})
        }
    });

    const payload = await parseEnvelope<T>(response);

    if (response.ok && payload.success) {
        return payload.data;
    }

    if (!payload.success) {
        throw new ApiClientError(response.status, payload.error.code, payload.error.message);
    }

    throw new ApiClientError(response.status, 'invalid_response', 'Unexpected API response');
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
    try {
        return (await response.json()) as ApiEnvelope<T>;
    } catch {
        throw new ApiClientError(response.status, 'invalid_response', 'API returned invalid JSON');
    }
}

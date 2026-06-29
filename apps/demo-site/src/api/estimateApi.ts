export type EstimateComplexity = 'low' | 'medium' | 'high';

export interface ClientConfigData {
    branding: {
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        fontFamily?: string;
    } | null;
    config: {
        id: number;
        versionNumber: number;
        estimatorConfig: {
            basePrice: number;
            multipliers: {
                size: number;
                complexity: number;
            };
            discounts: {
                bulk: number;
            };
        };
    };
}

export interface EstimateInput {
    size: number;
    complexity: EstimateComplexity;
    bulk: boolean;
}

export interface EstimateResult {
    total: number;
    breakdown: {
        basePrice: number;
        sizeMultiplier: number;
        complexityMultiplier: number;
        discount: number;
    };
    configVersion: {
        id: number;
        versionNumber: number;
    };
}

export interface LeadResponse {
    id: number;
}

interface LeadRequest {
    name?: string;
    email: string;
    phone?: string;
    estimateInput: EstimateInput;
    estimateData: EstimateResult;
    configVersionId: number;
}

interface ApiSuccessEnvelope<T> {
    success: true;
    data: T;
}

interface ApiErrorEnvelope {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export async function fetchClientConfig(apiBaseUrl: string, clientId: string): Promise<ClientConfigData> {
    const query = new URLSearchParams({ clientId });
    return requestDemoApi<ClientConfigData>(apiBaseUrl, `/client-config?${query.toString()}`);
}

export async function requestEstimate(apiBaseUrl: string, clientId: string, input: EstimateInput): Promise<EstimateResult> {
    return requestDemoApi<EstimateResult>(apiBaseUrl, '/estimate', {
        method: 'POST',
        body: JSON.stringify({
            clientId,
            input
        })
    });
}

export async function createLead(apiBaseUrl: string, clientId: string, input: LeadRequest): Promise<LeadResponse> {
    return requestDemoApi<LeadResponse>(apiBaseUrl, '/leads', {
        method: 'POST',
        body: JSON.stringify({
            clientId,
            ...input
        })
    });
}

async function requestDemoApi<T>(apiBaseUrl: string, path: string, init?: RequestInit): Promise<T> {
    const configuredApiBaseUrl = getDemoApiBaseUrl(apiBaseUrl);
    let response: Response;

    try {
        response = await fetch(`${configuredApiBaseUrl}${path}`, {
            ...init,
            headers: {
                Accept: 'application/json',
                ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
                ...(init?.headers ?? {})
            }
        });
    } catch {
        throw new Error(
            `Unable to reach the Estimate Engine API at ${configuredApiBaseUrl}. Confirm the backend is running and VITE_API_BASE_URL points to it. For local development, if port 3000 is occupied, start the backend on port 3001 and set VITE_API_BASE_URL=http://localhost:3001.`
        );
    }

    const payload = await readApiEnvelope<T>(response);

    if (response.ok && payload?.success) {
        return payload.data;
    }

    if (payload && !payload.success) {
        throw new Error(payload.error.message);
    }

    throw new Error('Unexpected API response');
}

function getDemoApiBaseUrl(apiBaseUrl: string): string {
    if (!apiBaseUrl) {
        throw new Error(
            'VITE_API_BASE_URL must be configured for the live estimate demo. For local development, start the backend on port 3001 if port 3000 is occupied and set VITE_API_BASE_URL=http://localhost:3001.'
        );
    }

    return apiBaseUrl;
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

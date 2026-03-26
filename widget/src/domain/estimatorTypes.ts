export interface ApiSuccessEnvelope<T> {
    success: true;
    data: T;
}

export interface ApiErrorEnvelope {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface WidgetBranding {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
}

export interface WidgetEstimatorConfig {
    basePrice: number;
    multipliers: {
        size: number;
        complexity: number;
    };
    discounts: {
        bulk: number;
    };
}

export interface WidgetClientConfigRecord {
    estimatorConfig: WidgetEstimatorConfig;
}

export interface WidgetClientConfigData {
    branding: WidgetBranding | null;
    config: WidgetClientConfigRecord;
}

export interface EstimateInput {
    size: number;
    complexity: 'low' | 'medium' | 'high';
    bulk: boolean;
}

export interface EstimateRequest {
    clientId: string;
    input: EstimateInput;
}

export interface EstimateResult {
    total: number;
    breakdown: {
        basePrice: number;
        sizeMultiplier: number;
        complexityMultiplier: number;
        discount: number;
    };
}

export interface LeadCaptureDetails {
    name?: string;
    email: string;
    phone?: string;
}

export interface LeadRequest extends LeadCaptureDetails {
    clientId: string;
    estimateInput: EstimateInput;
    estimateData: EstimateResult;
}

export interface LeadResponse {
    id: number;
}

export interface WidgetApiError {
    statusCode: number;
    code: string;
    message: string;
}

import { calculateEstimateFromConfig, EstimateInput, EstimateResponse } from '../domain/estimate';
import { getClientConfig } from './getClientConfig';

export interface EstimateRequest {
    clientId: string;
    input: EstimateInput;
}

export async function calculateEstimate(request: EstimateRequest): Promise<EstimateResponse> {
    const configData = await getClientConfig(request.clientId);
    return calculateEstimateFromConfig(configData.config.estimatorConfig, request.input);
}

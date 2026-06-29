import { WidgetRuntimeConfig } from '../config/runtimeConfig';
import { EstimateInput, EstimateResult } from '../domain/estimatorTypes';
import { requestApi } from './clientConfigApi';

export async function requestEstimate(
    config: WidgetRuntimeConfig,
    input: EstimateInput
): Promise<EstimateResult> {
    return requestApi<EstimateResult>(`${config.apiBaseUrl}/estimate`, {
        method: 'POST',
        body: JSON.stringify({
            clientId: config.clientId,
            input
        })
    });
}

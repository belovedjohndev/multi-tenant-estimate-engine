import { WidgetRuntimeConfig } from '../config/runtimeConfig';
import { LeadRequest, LeadResponse } from '../domain/estimatorTypes';
import { requestApi } from './clientConfigApi';

export async function submitLead(
    config: WidgetRuntimeConfig,
    payload: Omit<LeadRequest, 'clientId'>
): Promise<LeadResponse> {
    return requestApi<LeadResponse>(`${config.apiBaseUrl}/leads`, {
        method: 'POST',
        body: JSON.stringify({
            clientId: config.clientId,
            ...payload
        })
    });
}

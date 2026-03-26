import { NotFoundError } from './errors';
import { EstimateInput, EstimateResponse } from '../domain/estimate';
import { findClientByName, findClientConfigVersionById } from '../infrastructure/clientRepository';
import { sendLeadCreatedNotification } from '../infrastructure/leadNotificationEmailService';
import { insertLead } from '../infrastructure/leadRepository';

export interface CreateLeadRequest {
    clientId: string;
    name?: string;
    email: string;
    phone?: string;
    configVersionId?: number;
    estimateInput: EstimateInput;
    estimateData: EstimateResponse;
}

export async function createLead(request: CreateLeadRequest): Promise<number> {
    const client = await findClientByName(request.clientId);
    if (!client) {
        throw new NotFoundError('Client not found', 'client_not_found');
    }

    const configVersionId = request.configVersionId ?? request.estimateData.configVersion.id;
    const configVersion = await findClientConfigVersionById(client.id, configVersionId);

    if (!configVersion) {
        throw new NotFoundError('Config version not found for client', 'client_config_version_not_found');
    }

    const leadId = await insertLead({
        clientId: client.id,
        configVersionId: configVersion.id,
        name: request.name,
        email: request.email,
        phone: request.phone,
        estimateInput: request.estimateInput,
        estimateData: request.estimateData
    });

    try {
        await sendLeadCreatedNotification({
            leadId,
            client,
            lead: {
                name: request.name,
                email: request.email,
                phone: request.phone,
                estimateInput: request.estimateInput,
                estimateData: request.estimateData
            }
        });
    } catch (error) {
        console.error('Lead notification email failed', {
            clientId: client.id,
            clientName: client.name,
            leadId,
            error
        });
    }

    return leadId;
}

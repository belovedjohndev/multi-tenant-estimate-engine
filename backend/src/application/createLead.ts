import { NotFoundError } from './errors';
import { EstimateInput, EstimateResponse } from '../domain/estimate';
import { findClientByName } from '../infrastructure/clientRepository';
import { sendLeadCreatedNotification } from '../infrastructure/leadNotificationEmailService';
import { insertLead } from '../infrastructure/leadRepository';

export interface CreateLeadRequest {
    clientId: string;
    name?: string;
    email: string;
    phone?: string;
    estimateInput: EstimateInput;
    estimateData: EstimateResponse;
}

export async function createLead(request: CreateLeadRequest): Promise<number> {
    const client = await findClientByName(request.clientId);
    if (!client) {
        throw new NotFoundError('Client not found', 'client_not_found');
    }

    const leadId = await insertLead({
        clientId: client.id,
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

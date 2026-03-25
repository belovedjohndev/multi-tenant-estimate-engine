import { NotFoundError } from './errors';
import { EstimateResponse } from '../domain/estimate';
import { findClientIdByName } from '../infrastructure/clientRepository';
import { insertLead } from '../infrastructure/leadRepository';

export interface CreateLeadRequest {
    clientId: string;
    name?: string;
    email: string;
    phone?: string;
    estimateData: EstimateResponse;
}

export async function createLead(request: CreateLeadRequest): Promise<number> {
    const clientId = await findClientIdByName(request.clientId);
    if (!clientId) {
        throw new NotFoundError('Client not found', 'client_not_found');
    }

    return insertLead({
        clientId,
        name: request.name,
        email: request.email,
        phone: request.phone,
        estimateData: request.estimateData
    });
}

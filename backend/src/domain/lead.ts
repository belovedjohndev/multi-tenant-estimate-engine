import { EstimateResponse } from './estimate';

export interface Lead {
    id: number;
    clientId: number;
    name?: string;
    email: string;
    phone?: string;
    estimateData: EstimateResponse;
    createdAt: Date;
}

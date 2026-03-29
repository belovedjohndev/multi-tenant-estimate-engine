import { EstimateInput, EstimateResponse } from './estimate';

export interface Lead {
    id: number;
    clientId: number;
    configVersionId: number;
    name?: string;
    email: string;
    phone?: string;
    estimateInput?: EstimateInput;
    estimateData: EstimateResponse;
    createdAt: Date;
}

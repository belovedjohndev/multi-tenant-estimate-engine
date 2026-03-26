import { EstimateInput, EstimateResponse } from './estimate';

export interface DashboardLead {
    id: number;
    name?: string;
    email: string;
    phone?: string;
    estimateInput?: EstimateInput;
    estimateData: EstimateResponse;
    createdAt: Date;
}

export interface DashboardLeadSummary {
    totalLeadCount: number;
    averageEstimateTotal: number | null;
    latestLeadCreatedAt: Date | null;
}

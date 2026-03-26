import { EstimatorConfig } from './estimate';

export interface ClientSettings {
    clientId: string;
    companyName: string;
    logoUrl?: string;
    phone?: string;
    notificationEmail?: string;
    estimatorConfig: EstimatorConfig;
}

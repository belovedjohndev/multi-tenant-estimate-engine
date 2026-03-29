import { EstimatorConfig } from './estimate';

export interface ClientConfigHistoryEntry {
    id: number;
    versionNumber: number;
    createdAt: string;
    isActive: boolean;
    createdByEmail?: string;
}

export interface ClientSettings {
    clientId: string;
    companyName: string;
    logoUrl?: string;
    phone?: string;
    notificationEmail?: string;
    estimatorConfig: EstimatorConfig;
    currentConfigVersion: {
        id: number;
        versionNumber: number;
        createdAt: string;
    };
    configHistory: ClientConfigHistoryEntry[];
}

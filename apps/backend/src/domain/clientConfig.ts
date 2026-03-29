import { EstimatorConfig } from './estimate';

export interface ClientConfig {
    id: number;
    clientId: number;
    versionNumber: number;
    estimatorConfig: EstimatorConfig;
    createdByClientUserId?: number;
    createdAt: Date;
}

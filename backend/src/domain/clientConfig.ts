import { EstimatorConfig } from './estimate';

export interface ClientConfig {
    id: number;
    clientId: number;
    estimatorConfig: EstimatorConfig;
    createdAt: Date;
}

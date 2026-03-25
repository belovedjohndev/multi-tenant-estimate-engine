import { NotFoundError } from './errors';
import { EstimatorConfig } from '../domain/estimate';
import { findClientIdByName, getClientConfiguration } from '../infrastructure/clientRepository';

export interface ClientConfigurationResult {
    branding: {
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        fontFamily?: string;
    } | null;
    config: {
        estimatorConfig: EstimatorConfig;
    };
}

export async function getClientConfig(clientId: string): Promise<ClientConfigurationResult> {
    const resolvedClientId = await findClientIdByName(clientId);
    if (!resolvedClientId) {
        throw new NotFoundError('Client not found', 'client_not_found');
    }

    const clientConfiguration = await getClientConfiguration(resolvedClientId);
    if (!clientConfiguration.config) {
        throw new NotFoundError('Client config not found', 'client_config_not_found');
    }

    return {
        branding: clientConfiguration.branding
            ? {
                  logoUrl: clientConfiguration.branding.logoUrl,
                  primaryColor: clientConfiguration.branding.primaryColor,
                  secondaryColor: clientConfiguration.branding.secondaryColor,
                  fontFamily: clientConfiguration.branding.fontFamily
              }
            : null,
        config: {
            estimatorConfig: clientConfiguration.config.estimatorConfig
        }
    };
}

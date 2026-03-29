import { ForbiddenError } from './errors';
import { EstimatorConfig, parseEstimatorConfigRecord } from '../domain/estimate';
import { resetDemoClientState } from '../infrastructure/clientRepository';

export interface ResetPortalDemoStateResult {
    reset: true;
    clientId: string;
    clearedLeadCount: number;
    removedConfigVersionCount: number;
}

export async function resetPortalDemoState(input: {
    clientId: number;
    clientName: string;
    actorClientUserId?: number;
}): Promise<ResetPortalDemoStateResult> {
    const demoClientId = readOptionalEnvValue(process.env.CLIENT_PORTAL_DEMO_RESET_CLIENT_ID) || 'demo';

    if (input.clientName !== demoClientId) {
        throw new ForbiddenError('Demo reset is only available for the demo tenant.', 'demo_reset_unavailable');
    }

    const resetResult = await resetDemoClientState(input.clientId, getDemoResetProfile(), input.actorClientUserId);

    return {
        reset: true,
        clientId: input.clientName,
        clearedLeadCount: resetResult.clearedLeadCount,
        removedConfigVersionCount: resetResult.removedConfigVersionCount
    };
}

function getDemoResetProfile(): {
    companyName: string;
    phone?: string;
    notificationEmail?: string;
    logoUrl?: string;
    estimatorConfig: EstimatorConfig;
} {
    const estimatorConfigJson =
        readOptionalEnvValue(process.env.CLIENT_PORTAL_DEMO_RESET_ESTIMATOR_CONFIG) ||
        JSON.stringify({
            basePrice: 100,
            multipliers: {
                size: 1.5,
                complexity: 2
            },
            discounts: {
                bulk: 0.1
            }
        });

    let estimatorConfig: EstimatorConfig;

    try {
        estimatorConfig = parseEstimatorConfigRecord(
            JSON.parse(estimatorConfigJson),
            'CLIENT_PORTAL_DEMO_RESET_ESTIMATOR_CONFIG'
        );
    } catch (error) {
        throw new Error(
            error instanceof Error
                ? error.message
                : 'CLIENT_PORTAL_DEMO_RESET_ESTIMATOR_CONFIG must be valid estimator config JSON'
        );
    }

    return {
        companyName: readOptionalEnvValue(process.env.CLIENT_PORTAL_DEMO_RESET_COMPANY_NAME) || 'demo',
        phone: readOptionalEnvValue(process.env.CLIENT_PORTAL_DEMO_RESET_PHONE) || undefined,
        notificationEmail: readOptionalEnvValue(process.env.CLIENT_PORTAL_DEMO_RESET_NOTIFICATION_EMAIL) || undefined,
        logoUrl: readOptionalEnvValue(process.env.CLIENT_PORTAL_DEMO_RESET_LOGO_URL) || undefined,
        estimatorConfig
    };
}

function readOptionalEnvValue(value: string | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue || null;
}

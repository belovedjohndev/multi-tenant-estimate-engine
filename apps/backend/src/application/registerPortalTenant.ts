import { AuthenticatedPortalSessionResult } from './authenticatePortalUser';
import { ConflictError } from './errors';
import { EstimatorConfig } from '../domain/estimate';
import { generateSessionToken, hashPassword, hashSessionToken } from '../infrastructure/authSecurity';
import { logInfo } from '../infrastructure/logger';
import { registerTenant } from '../infrastructure/tenantSignupRepository';

export interface RegisterPortalTenantRequest {
    clientId: string;
    companyName: string;
    fullName: string;
    email: string;
    password: string;
    phone?: string;
}

const DEFAULT_ESTIMATOR_CONFIG: EstimatorConfig = {
    basePrice: 100,
    multipliers: {
        size: 1.5,
        complexity: 2
    },
    discounts: {
        bulk: 0.1
    }
};

const DEFAULT_BRANDING = {
    primaryColor: '#1d4ed8',
    secondaryColor: '#0f766e',
    fontFamily: 'Avenir Next'
};

export async function registerPortalTenant(
    request: RegisterPortalTenantRequest
): Promise<AuthenticatedPortalSessionResult> {
    if (isReservedClientId(request.clientId)) {
        throw new ConflictError('That company ID is reserved', 'reserved_client_id');
    }

    const token = generateSessionToken();
    const expiresAt = calculateExpiryDate();
    const passwordHash = await hashPassword(request.password);
    const result = await registerTenant({
        clientId: request.clientId,
        companyName: request.companyName,
        fullName: request.fullName,
        email: request.email,
        phone: request.phone,
        passwordHash,
        sessionTokenHash: hashSessionToken(token),
        sessionExpiresAt: expiresAt,
        defaultEstimatorConfig: DEFAULT_ESTIMATOR_CONFIG,
        defaultBranding: DEFAULT_BRANDING
    });

    logInfo('portal_signup_succeeded', {
        clientId: result.client.id,
        clientName: result.client.name,
        clientUserId: result.user.id,
        email: result.user.email,
        sessionExpiresAt: expiresAt.toISOString()
    });

    return {
        token,
        expiresAt: expiresAt.toISOString(),
        user: result.user,
        client: result.client
    };
}

function calculateExpiryDate(): Date {
    const sessionTtlHours = parsePositiveIntegerEnv('CLIENT_PORTAL_SESSION_TTL_HOURS', 168);
    const expiresAt = new Date();

    expiresAt.setHours(expiresAt.getHours() + sessionTtlHours);

    return expiresAt;
}

function parsePositiveIntegerEnv(name: string, fallback: number): number {
    const rawValue = process.env[name];

    if (!rawValue) {
        return fallback;
    }

    const parsedValue = Number.parseInt(rawValue, 10);

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error(`${name} must be a positive integer when provided`);
    }

    return parsedValue;
}

function isReservedClientId(clientId: string): boolean {
    const reservedClientIds = new Set([
        'demo',
        (process.env.CLIENT_PORTAL_DEMO_RESET_CLIENT_ID || 'demo').trim().toLowerCase()
    ]);

    return reservedClientIds.has(clientId.trim().toLowerCase());
}

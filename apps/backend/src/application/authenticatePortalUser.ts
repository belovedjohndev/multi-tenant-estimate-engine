import { UnauthorizedError } from './errors';
import { findClientByName } from '../infrastructure/clientRepository';
import {
    createClientSession,
    findClientUserForLogin,
    updateClientUserLastLogin
} from '../infrastructure/clientUserRepository';
import { generateSessionToken, hashSessionToken, verifyPassword } from '../infrastructure/authSecurity';
import { logInfo } from '../infrastructure/logger';

export interface AuthenticatePortalUserRequest {
    clientId: string;
    email: string;
    password: string;
}

export interface AuthenticatedPortalSessionResult {
    token: string;
    expiresAt: string;
    user: {
        id: number;
        email: string;
        fullName: string;
    };
    client: {
        id: number;
        name: string;
    };
}

export async function authenticatePortalUser(
    request: AuthenticatePortalUserRequest
): Promise<AuthenticatedPortalSessionResult> {
    const client = await findClientByName(request.clientId);

    if (!client) {
        throw new UnauthorizedError('Invalid client credentials', 'invalid_credentials');
    }

    const user = await findClientUserForLogin(client.id, request.email);

    if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid email or password', 'invalid_credentials');
    }

    const passwordIsValid = await verifyPassword(request.password, user.passwordHash);

    if (!passwordIsValid) {
        throw new UnauthorizedError('Invalid email or password', 'invalid_credentials');
    }

    const token = generateSessionToken();
    const expiresAt = calculateExpiryDate();

    await Promise.all([
        createClientSession({
            clientUserId: user.id,
            tokenHash: hashSessionToken(token),
            expiresAt
        }),
        updateClientUserLastLogin(user.id)
    ]);

    logInfo('portal_login_succeeded', {
        clientId: client.id,
        clientName: client.name,
        clientUserId: user.id,
        email: user.email,
        sessionExpiresAt: expiresAt.toISOString()
    });

    return {
        token,
        expiresAt: expiresAt.toISOString(),
        user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName
        },
        client: {
            id: client.id,
            name: client.name
        }
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

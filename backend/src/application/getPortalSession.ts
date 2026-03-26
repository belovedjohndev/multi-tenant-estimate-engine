import { UnauthorizedError } from './errors';
import { hashSessionToken } from '../infrastructure/authSecurity';
import { getClientBranding } from '../infrastructure/clientRepository';
import { findClientSessionContextByTokenHash, touchClientSession } from '../infrastructure/clientUserRepository';

export interface PortalSessionResult {
    user: {
        id: number;
        email: string;
        fullName: string;
        lastLoginAt?: string;
    };
    client: {
        id: number;
        name: string;
        branding: {
            logoUrl?: string;
            primaryColor?: string;
            secondaryColor?: string;
            fontFamily?: string;
        } | null;
    };
    session: {
        id: number;
        expiresAt: string;
        lastSeenAt: string;
    };
}

export async function getPortalSession(token: string): Promise<PortalSessionResult> {
    const context = await requirePortalSessionContext(token);
    return getPortalSessionFromContext(context);
}

export async function getPortalSessionFromContext(
    context: Awaited<ReturnType<typeof requirePortalSessionContext>>
): Promise<PortalSessionResult> {
    const branding = await getClientBranding(context.client.id);

    return {
        user: {
            id: context.user.id,
            email: context.user.email,
            fullName: context.user.fullName,
            lastLoginAt: context.user.lastLoginAt?.toISOString()
        },
        client: {
            id: context.client.id,
            name: context.client.name,
            branding: branding
                ? {
                      logoUrl: branding.logoUrl,
                      primaryColor: branding.primaryColor,
                      secondaryColor: branding.secondaryColor,
                      fontFamily: branding.fontFamily
                  }
                : null
        },
        session: {
            id: context.session.id,
            expiresAt: context.session.expiresAt.toISOString(),
            lastSeenAt: context.session.lastSeenAt.toISOString()
        }
    };
}

export async function requirePortalSessionContext(token: string) {
    const context = await findClientSessionContextByTokenHash(hashSessionToken(token));

    if (!context || !context.user.isActive) {
        throw new UnauthorizedError('Authentication is required', 'invalid_session');
    }

    if (context.session.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedError('Session has expired', 'session_expired');
    }

    await touchClientSession(context.session.id);

    return context;
}

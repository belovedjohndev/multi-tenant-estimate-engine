import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../application/errors';
import { requirePortalSessionContext } from '../application/getPortalSession';

export interface AuthenticatedPortalRequest extends Request {
    portalSession: Awaited<ReturnType<typeof requirePortalSessionContext>>;
    portalToken: string;
}

export async function requirePortalAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const token = parseBearerToken(req.header('Authorization'));
        const portalSession = await requirePortalSessionContext(token);

        (req as AuthenticatedPortalRequest).portalSession = portalSession;
        (req as AuthenticatedPortalRequest).portalToken = token;
        return next();
    } catch (error) {
        return next(error);
    }
}

function parseBearerToken(headerValue: string | undefined): string {
    if (!headerValue) {
        throw new UnauthorizedError('Authentication is required', 'missing_authorization');
    }

    const [scheme, token] = headerValue.split(' ');

    if (scheme !== 'Bearer' || !token) {
        throw new UnauthorizedError('Authorization header must use Bearer token format', 'invalid_authorization');
    }

    return token;
}

import { NextFunction, Request, Response } from 'express';
import { requirePortalSessionContext } from '../application/getPortalSession';
import { readPortalSessionTokenFromRequest } from './cookies';

export interface AuthenticatedPortalRequest extends Request {
    portalSession: Awaited<ReturnType<typeof requirePortalSessionContext>>;
    portalToken: string;
}

export async function requirePortalAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const token = readPortalSessionTokenFromRequest(req);
        const portalSession = await requirePortalSessionContext(token);

        (req as AuthenticatedPortalRequest).portalSession = portalSession;
        (req as AuthenticatedPortalRequest).portalToken = token;
        return next();
    } catch (error) {
        return next(error);
    }
}

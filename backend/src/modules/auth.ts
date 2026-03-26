import express, { NextFunction, Request, Response } from 'express';
import { authenticatePortalUser } from '../application/authenticatePortalUser';
import { getPortalSessionFromContext } from '../application/getPortalSession';
import { logoutPortalSession } from '../application/logoutPortalSession';
import { requirePortalAuth, AuthenticatedPortalRequest } from '../http/auth';
import { sendSuccess } from '../http/api';
import {
    clearPortalSessionCookie,
    readOptionalPortalSessionTokenFromRequest,
    setPortalSessionCookie
} from '../http/cookies';
import { parsePortalLoginRequest } from '../http/validation';

const router = express.Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = parsePortalLoginRequest(req.body);
        const session = await authenticatePortalUser(body);
        setPortalSessionCookie(res, session.token, new Date(session.expiresAt));

        return sendSuccess(
            res,
            {
                expiresAt: session.expiresAt,
                user: session.user,
                client: session.client
            },
            201
        );
    } catch (error) {
        return next(error);
    }
});

router.get('/me', requirePortalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = req as AuthenticatedPortalRequest;
        const session = await getPortalSessionFromContext(request.portalSession);
        return sendSuccess(res, session);
    } catch (error) {
        return next(error);
    }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = readOptionalPortalSessionTokenFromRequest(req);

        if (token) {
            await logoutPortalSession(token);
        }

        clearPortalSessionCookie(res);
        return sendSuccess(res, { loggedOut: true });
    } catch (error) {
        return next(error);
    }
});

export { router as authModule };

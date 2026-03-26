import express, { NextFunction, Request, Response } from 'express';
import { authenticatePortalUser } from '../application/authenticatePortalUser';
import { getPortalSession } from '../application/getPortalSession';
import { logoutPortalSession } from '../application/logoutPortalSession';
import { requirePortalAuth, AuthenticatedPortalRequest } from '../http/auth';
import { sendSuccess } from '../http/api';
import { parsePortalLoginRequest } from '../http/validation';

const router = express.Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = parsePortalLoginRequest(req.body);
        const session = await authenticatePortalUser(body);
        return sendSuccess(res, session, 201);
    } catch (error) {
        return next(error);
    }
});

router.get('/me', requirePortalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = req as AuthenticatedPortalRequest;
        const session = await getPortalSession(request.portalToken);
        return sendSuccess(res, session);
    } catch (error) {
        return next(error);
    }
});

router.post('/logout', requirePortalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = req as AuthenticatedPortalRequest;
        await logoutPortalSession(request.portalToken);
        return sendSuccess(res, { loggedOut: true });
    } catch (error) {
        return next(error);
    }
});

export { router as authModule };

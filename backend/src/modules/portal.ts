import express, { NextFunction, Request, Response } from 'express';
import { getPortalClientSettings } from '../application/getPortalClientSettings';
import { listPortalLeads } from '../application/listPortalLeads';
import { updatePortalClientSettings } from '../application/updatePortalClientSettings';
import { requirePortalAuth, AuthenticatedPortalRequest } from '../http/auth';
import { sendSuccess } from '../http/api';
import { LeadListQueryDto, parseLeadListQuery, parsePortalClientSettingsUpdate } from '../http/validation';

const router = express.Router();

router.get('/client', requirePortalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = req as AuthenticatedPortalRequest;
        const clientSettings = await getPortalClientSettings(request.portalSession.client.id);
        return sendSuccess(res, clientSettings);
    } catch (error) {
        return next(error);
    }
});

router.put('/client', requirePortalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = req as AuthenticatedPortalRequest;
        const body = parsePortalClientSettingsUpdate(req.body);
        const updatedSettings = await updatePortalClientSettings(
            request.portalSession.client.id,
            body,
            request.portalSession.user.id
        );
        return sendSuccess(res, updatedSettings);
    } catch (error) {
        return next(error);
    }
});

router.get(
    '/leads',
    requirePortalAuth,
    async (
        req: Request<Record<string, never>, unknown, unknown, LeadListQueryDto>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const request = req as unknown as AuthenticatedPortalRequest;
            const { limit } = parseLeadListQuery(req.query);
            const leads = await listPortalLeads(request.portalSession.client.id, limit);
            return sendSuccess(res, leads);
        } catch (error) {
            return next(error);
        }
    }
);

export { router as portalModule };

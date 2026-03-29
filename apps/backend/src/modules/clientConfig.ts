import express, { Request, Response, NextFunction } from 'express';
import { getClientConfig } from '../application/getClientConfig';
import { sendSuccess } from '../http/api';
import { ClientConfigQueryDto, parseClientConfigQuery } from '../http/validation';

const router = express.Router();

router.get(
    '/',
    async (
        req: Request<Record<string, never>, unknown, unknown, ClientConfigQueryDto>,
        res: Response,
        next: NextFunction
    ) => {
    try {
        const { clientId } = parseClientConfigQuery(req.query);
        const data = await getClientConfig(clientId);
        return sendSuccess(res, data);
    } catch (error) {
        return next(error);
    }
    }
);

export { router as clientConfigModule };

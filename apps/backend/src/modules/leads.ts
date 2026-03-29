import express, { NextFunction, Request, Response } from 'express';
import { createLead } from '../application/createLead';
import { sendSuccess } from '../http/api';
import { parseCreateLeadRequest } from '../http/validation';

const router = express.Router();

router.post('/', async (req: Request<Record<string, never>, unknown, unknown>, res: Response, next: NextFunction) => {
    try {
        const body = parseCreateLeadRequest(req.body);
        const id = await createLead(body);
        return sendSuccess(res, { id }, 201);
    } catch (error) {
        return next(error);
    }
});

export { router as leadsModule };

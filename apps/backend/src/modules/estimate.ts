import express, { NextFunction, Request, Response } from 'express';
import { calculateEstimate } from '../application/calculateEstimate';
import { sendSuccess } from '../http/api';
import { parseEstimateRequest } from '../http/validation';

const router = express.Router();

router.post('/', async (req: Request<Record<string, never>, unknown, unknown>, res: Response, next: NextFunction) => {
    try {
        const body = parseEstimateRequest(req.body);
        const result = await calculateEstimate(body);
        return sendSuccess(res, result);
    } catch (error) {
        return next(error);
    }
});

export { router as estimateModule };

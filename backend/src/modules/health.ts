import express, { Request, Response } from 'express';
import { checkDatabaseHealth } from '../infrastructure/database';
import { getLeadNotificationHealth } from '../infrastructure/leadNotificationEmailService';
import { logWarn } from '../infrastructure/logger';

const router = express.Router();

router.get('/', (_req: Request, res: Response) => {
    return res.status(200).json({
        status: 'ok',
        service: 'estimate-engine-backend',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime())
    });
});

router.get('/db', async (_req: Request, res: Response) => {
    try {
        const health = await checkDatabaseHealth();

        return res.status(200).json({
            status: 'ok',
            database: health
        });
    } catch (error) {
        logWarn('health_db_failed', {
            error
        });

        return res.status(503).json({
            status: 'unhealthy',
            database: {
                status: 'unhealthy'
            }
        });
    }
});

router.get('/email', (_req: Request, res: Response) => {
    const health = getLeadNotificationHealth();

    return res.status(health.configured ? 200 : 503).json({
        status: health.configured ? 'ok' : 'unhealthy',
        email: health
    });
});

export { router as healthModule };

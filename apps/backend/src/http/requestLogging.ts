import { NextFunction, Request, Response } from 'express';
import { logInfo } from '../infrastructure/logger';

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();

    logInfo('request_started', {
        method: req.method,
        path: req.originalUrl || req.url,
        remoteAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined
    });

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

        logInfo('request_completed', {
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2))
        });
    });

    next();
}

import { NextFunction, Request, Response } from 'express';
import { AppError, isAppError } from '../application/errors';
import { logError, logWarn } from '../infrastructure/logger';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data
    });
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
    next(new AppError(404, 'not_found', 'Route not found'));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
    if (isBodyParseError(error)) {
        logWarn('request_invalid_json', {
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: 400
        });

        return res.status(400).json({
            success: false,
            error: {
                code: 'invalid_json',
                message: 'Request body must be valid JSON'
            }
        });
    }

    if (isAppError(error)) {
        logWarn('request_app_error', {
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: error.statusCode,
            errorCode: error.code,
            errorMessage: error.message
        });

        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message
            }
        });
    }

    logError('request_unhandled_error', {
        method: req.method,
        path: req.originalUrl || req.url,
        error
    });

    return res.status(500).json({
        success: false,
        error: {
            code: 'internal_server_error',
            message: 'An unexpected error occurred'
        }
    });
}

function isBodyParseError(error: unknown): error is SyntaxError & { status: number; body: unknown } {
    return error instanceof SyntaxError && 'status' in error && 'body' in error;
}

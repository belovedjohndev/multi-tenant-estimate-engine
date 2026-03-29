import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export interface RequestContext {
    requestId: string;
    method: string;
    path: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = readRequestId(req);
    const requestContext: RequestContext = {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url
    };

    res.setHeader('X-Request-Id', requestId);
    res.locals.requestId = requestId;

    requestContextStorage.run(requestContext, () => {
        next();
    });
}

export function getRequestContext(): RequestContext | undefined {
    return requestContextStorage.getStore();
}

function readRequestId(req: Request): string {
    const incomingValue = req.header('X-Request-Id')?.trim();

    return incomingValue || randomUUID();
}

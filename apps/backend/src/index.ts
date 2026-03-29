import express from 'express';
import { Server } from 'node:http';
import { authModule } from './modules/auth';
import { clientConfigModule } from './modules/clientConfig';
import { leadsModule } from './modules/leads';
import { portalModule } from './modules/portal';
import { estimateModule } from './modules/estimate';
import { healthModule } from './modules/health';
import { errorHandler, notFoundHandler } from './http/api';
import { requestContextMiddleware } from './http/requestContext';
import { requestLoggingMiddleware } from './http/requestLogging';
import { verifyDatabaseConnection } from './infrastructure/database';
import { logError, logInfo } from './infrastructure/logger';

export function createApp() {
    const app = express();
    const allowedOrigins = getAllowedOrigins();

    app.use(requestContextMiddleware);
    app.use(requestLoggingMiddleware);
    app.use((req, res, next) => {
        const requestOrigin = req.header('Origin');

        if (requestOrigin && allowedOrigins.has(requestOrigin)) {
            res.header('Access-Control-Allow-Origin', requestOrigin);
            res.header('Vary', 'Origin');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type,X-Request-Id');
            res.header('Access-Control-Expose-Headers', 'X-Request-Id');
        }

        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }

        return next();
    });
    app.use(express.json());

    app.use('/health', healthModule);
    app.use('/client-config', clientConfigModule);
    app.use('/leads', leadsModule);
    app.use('/estimate', estimateModule);
    app.use('/auth', authModule);
    app.use('/me', portalModule);
    app.use('/portal', portalModule);
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

const port = process.env.PORT || 3000;

export async function start(): Promise<Server> {
    await verifyDatabaseConnection();
    const app = createApp();

    return app.listen(port, () => {
        logInfo('backend_started', {
            port: Number(port)
        });
    });
}

if (require.main === module) {
    start().catch((error) => {
        logError('backend_start_failed', {
            error
        });
        process.exit(1);
    });
}

function getAllowedOrigins(): Set<string> {
    const configuredOrigins = [process.env.WIDGET_ORIGIN, process.env.PORTAL_ORIGIN]
        .flatMap((value) => (value ? value.split(',') : []))
        .map((value) => value.trim())
        .filter(Boolean);

    if (!configuredOrigins.length) {
        return new Set(['http://localhost:4173', 'http://localhost:4174']);
    }

    return new Set(configuredOrigins);
}

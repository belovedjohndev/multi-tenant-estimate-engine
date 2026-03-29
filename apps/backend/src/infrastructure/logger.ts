import { getRequestContext } from '../http/requestContext';

type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

export function logInfo(event: string, fields: LogFields = {}) {
    writeLog('info', event, fields);
}

export function logWarn(event: string, fields: LogFields = {}) {
    writeLog('warn', event, fields);
}

export function logError(event: string, fields: LogFields = {}) {
    writeLog('error', event, fields);
}

function writeLog(level: LogLevel, event: string, fields: LogFields) {
    const requestContext = getRequestContext();
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        event,
        service: 'estimate-engine-backend',
        environment: process.env.NODE_ENV ?? 'development',
        ...(requestContext
            ? {
                  requestId: requestContext.requestId,
                  requestMethod: requestContext.method,
                  requestPath: requestContext.path
              }
            : {}),
        ...normalizeRecord(fields)
    };

    const line = JSON.stringify(entry);

    if (level === 'error') {
        console.error(line);
        return;
    }

    if (level === 'warn') {
        console.warn(line);
        return;
    }

    console.log(line);
}

function normalizeRecord(fields: LogFields): LogFields {
    return Object.entries(fields).reduce<LogFields>((normalized, [key, value]) => {
        normalized[key] = normalizeValue(value);
        return normalized;
    }, {});
}

function normalizeValue(value: unknown): unknown {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
            ...(value instanceof Object && 'code' in value ? { code: String(value.code) } : {}),
            ...(value instanceof Object && 'statusCode' in value ? { statusCode: Number(value.statusCode) } : {})
        };
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeValue(item));
    }

    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((normalized, [key, nestedValue]) => {
            normalized[key] = normalizeValue(nestedValue);
            return normalized;
        }, {});
    }

    return value;
}

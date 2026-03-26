import { Request, Response } from 'express';
import { UnauthorizedError } from '../application/errors';

const DEFAULT_PORTAL_COOKIE_NAME = 'estimate_engine_portal_session';

export function readPortalSessionTokenFromRequest(req: Request): string {
    const cookieValue = readOptionalPortalSessionTokenFromRequest(req);

    if (!cookieValue) {
        throw new UnauthorizedError('Authentication is required', 'missing_session_cookie');
    }

    return cookieValue;
}

export function readOptionalPortalSessionTokenFromRequest(req: Request): string | null {
    const cookies = parseCookieHeader(req.header('Cookie'));
    const cookieValue = cookies[getPortalSessionCookieName()];

    return cookieValue ?? null;
}

export function setPortalSessionCookie(res: Response, token: string, expiresAt: Date): void {
    res.append('Set-Cookie', serializeCookie(getPortalSessionCookieName(), token, expiresAt));
}

export function clearPortalSessionCookie(res: Response): void {
    res.append(
        'Set-Cookie',
        serializeCookie(getPortalSessionCookieName(), '', new Date(0), {
            maxAgeSeconds: 0
        })
    );
}

export function getPortalSessionCookieName(): string {
    const configuredName = process.env.CLIENT_PORTAL_COOKIE_NAME?.trim();

    return configuredName || DEFAULT_PORTAL_COOKIE_NAME;
}

function serializeCookie(
    name: string,
    value: string,
    expiresAt: Date,
    options?: {
        maxAgeSeconds?: number;
    }
): string {
    const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', `Expires=${expiresAt.toUTCString()}`];
    const maxAgeSeconds =
        options?.maxAgeSeconds ?? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    parts.push(`Max-Age=${maxAgeSeconds}`);
    parts.push(`SameSite=${getPortalCookieSameSite()}`);

    if (shouldUseSecurePortalCookie()) {
        parts.push('Secure');
    }

    return parts.join('; ');
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
    if (!cookieHeader) {
        return {};
    }

    return cookieHeader.split(';').reduce<Record<string, string>>((accumulator, cookiePart) => {
        const separatorIndex = cookiePart.indexOf('=');

        if (separatorIndex <= 0) {
            return accumulator;
        }

        const cookieName = cookiePart.slice(0, separatorIndex).trim();
        const rawValue = cookiePart.slice(separatorIndex + 1).trim();

        accumulator[cookieName] = decodeURIComponent(rawValue);
        return accumulator;
    }, {});
}

function getPortalCookieSameSite(): 'Strict' | 'Lax' | 'None' {
    const configuredValue = (process.env.CLIENT_PORTAL_COOKIE_SAME_SITE || 'lax').trim().toLowerCase();

    if (configuredValue === 'strict') {
        return 'Strict';
    }

    if (configuredValue === 'none') {
        return 'None';
    }

    if (configuredValue !== 'lax') {
        throw new Error('CLIENT_PORTAL_COOKIE_SAME_SITE must be one of lax, strict, or none');
    }

    return 'Lax';
}

function shouldUseSecurePortalCookie(): boolean {
    const configuredValue = process.env.CLIENT_PORTAL_COOKIE_SECURE?.trim().toLowerCase();

    if (!configuredValue) {
        return process.env.NODE_ENV === 'production';
    }

    if (configuredValue === 'true') {
        return true;
    }

    if (configuredValue === 'false') {
        return false;
    }

    throw new Error('CLIENT_PORTAL_COOKIE_SECURE must be true or false when provided');
}

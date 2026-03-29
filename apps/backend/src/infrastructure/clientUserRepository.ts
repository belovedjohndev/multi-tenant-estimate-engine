import { ClientSession } from '../domain/clientSession';
import { ClientUser } from '../domain/clientUser';
import { pool } from './database';

interface ClientUserRow {
    id: number;
    client_id: number;
    email: string;
    full_name: string;
    password_hash: string;
    is_active: boolean;
    created_at: Date;
    last_login_at: Date | null;
}

interface ClientSessionRow {
    id: number;
    client_user_id: number;
    token_hash: string;
    expires_at: Date;
    revoked_at: Date | null;
    created_at: Date;
    last_seen_at: Date;
}

interface ClientSessionContextRow {
    session_id: number;
    session_token_hash: string;
    session_expires_at: Date;
    session_created_at: Date;
    session_last_seen_at: Date;
    user_id: number;
    user_client_id: number;
    user_email: string;
    user_full_name: string;
    user_is_active: boolean;
    user_created_at: Date;
    user_last_login_at: Date | null;
    client_name: string;
}

export interface ClientSessionContext {
    session: ClientSession;
    user: ClientUser;
    client: {
        id: number;
        name: string;
    };
}

export async function findClientUserForLogin(
    clientId: number,
    email: string
): Promise<(ClientUser & { passwordHash: string }) | null> {
    const result = await pool.query<ClientUserRow>(
        `SELECT id, client_id, email, full_name, password_hash, is_active, created_at, last_login_at
         FROM client_users
         WHERE client_id = $1 AND email = $2`,
        [clientId, normalizeEmail(email)]
    );

    const row = result.rows[0];

    if (!row) {
        return null;
    }

    return {
        ...mapClientUser(row),
        passwordHash: row.password_hash
    };
}

export async function createOrUpdateClientUser(input: {
    clientId: number;
    email: string;
    fullName: string;
    passwordHash: string;
}): Promise<ClientUser> {
    const result = await pool.query<ClientUserRow>(
        `INSERT INTO client_users (client_id, email, full_name, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (client_id, email)
         DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, is_active = true
         RETURNING id, client_id, email, full_name, password_hash, is_active, created_at, last_login_at`,
        [input.clientId, normalizeEmail(input.email), input.fullName.trim(), input.passwordHash]
    );

    return mapClientUser(result.rows[0]);
}

export async function updateClientUserLastLogin(userId: number): Promise<void> {
    await pool.query('UPDATE client_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
}

export async function createClientSession(input: {
    clientUserId: number;
    tokenHash: string;
    expiresAt: Date;
}): Promise<ClientSession> {
    const result = await pool.query<ClientSessionRow>(
        `INSERT INTO client_sessions (client_user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, client_user_id, token_hash, expires_at, revoked_at, created_at, last_seen_at`,
        [input.clientUserId, input.tokenHash, input.expiresAt]
    );

    return mapClientSession(result.rows[0]);
}

export async function findClientSessionContextByTokenHash(tokenHash: string): Promise<ClientSessionContext | null> {
    const result = await pool.query<ClientSessionContextRow>(
        `SELECT
             s.id AS session_id,
             s.token_hash AS session_token_hash,
             s.expires_at AS session_expires_at,
             s.created_at AS session_created_at,
             s.last_seen_at AS session_last_seen_at,
             u.id AS user_id,
             u.client_id AS user_client_id,
             u.email AS user_email,
             u.full_name AS user_full_name,
             u.is_active AS user_is_active,
             u.created_at AS user_created_at,
             u.last_login_at AS user_last_login_at,
             c.name AS client_name
         FROM client_sessions s
         JOIN client_users u ON u.id = s.client_user_id
         JOIN clients c ON c.id = u.client_id
         WHERE s.token_hash = $1 AND s.revoked_at IS NULL`,
        [tokenHash]
    );

    const row = result.rows[0];

    if (!row) {
        return null;
    }

    return {
        session: {
            id: row.session_id,
            clientUserId: row.user_id,
            tokenHash: row.session_token_hash,
            expiresAt: row.session_expires_at,
            createdAt: row.session_created_at,
            lastSeenAt: row.session_last_seen_at
        },
        user: {
            id: row.user_id,
            clientId: row.user_client_id,
            email: row.user_email,
            fullName: row.user_full_name,
            isActive: row.user_is_active,
            createdAt: row.user_created_at,
            lastLoginAt: row.user_last_login_at ?? undefined
        },
        client: {
            id: row.user_client_id,
            name: row.client_name
        }
    };
}

export async function touchClientSession(sessionId: number): Promise<void> {
    await pool.query('UPDATE client_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [sessionId]);
}

export async function revokeClientSessionByTokenHash(tokenHash: string): Promise<void> {
    await pool.query(
        'UPDATE client_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND revoked_at IS NULL',
        [tokenHash]
    );
}

function mapClientUser(row: ClientUserRow): ClientUser {
    return {
        id: row.id,
        clientId: row.client_id,
        email: row.email,
        fullName: row.full_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at ?? undefined
    };
}

function mapClientSession(row: ClientSessionRow): ClientSession {
    return {
        id: row.id,
        clientUserId: row.client_user_id,
        tokenHash: row.token_hash,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at ?? undefined,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at
    };
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

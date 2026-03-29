import { ConflictError } from '../application/errors';
import { EstimatorConfig } from '../domain/estimate';
import { insertAuditLog } from './auditLogRepository';
import { pool } from './database';

interface ExistingClientRow {
    id: number;
    is_system_client: boolean;
}

interface InsertedClientRow {
    id: number;
    name: string;
}

interface InsertedUserRow {
    id: number;
    email: string;
    full_name: string;
}

export interface RegisterTenantRecord {
    clientId: string;
    companyName: string;
    fullName: string;
    email: string;
    phone?: string;
    passwordHash: string;
    sessionTokenHash: string;
    sessionExpiresAt: Date;
    defaultEstimatorConfig: EstimatorConfig;
    defaultBranding: {
        primaryColor: string;
        secondaryColor: string;
        fontFamily: string;
    };
}

export interface RegisteredTenantResult {
    client: {
        id: number;
        name: string;
    };
    user: {
        id: number;
        email: string;
        fullName: string;
    };
}

export async function registerTenant(record: RegisterTenantRecord): Promise<RegisteredTenantResult> {
    const connection = await pool.connect();

    try {
        await connection.query('BEGIN');

        const existingClientRes = await connection.query<ExistingClientRow>(
            'SELECT id, is_system_client FROM clients WHERE name = $1 FOR UPDATE',
            [record.clientId]
        );

        if (existingClientRes.rows[0]) {
            if (existingClientRes.rows[0].is_system_client) {
                throw new ConflictError('That company ID is reserved', 'reserved_client_id');
            }

            throw new ConflictError('That company ID is unavailable', 'client_id_unavailable');
        }

        const insertedClientRes = await connection.query<InsertedClientRow>(
            `INSERT INTO clients (name, company_name, phone, notification_email, active_config_version_id, is_system_client)
             VALUES ($1, $2, $3, $4, $5, FALSE)
             RETURNING id, name`,
            [record.clientId, record.companyName, record.phone ?? null, record.email, null]
        );
        const insertedClient = insertedClientRes.rows[0];

        const insertedUserRes = await connection.query<InsertedUserRow>(
            `INSERT INTO client_users (client_id, email, full_name, password_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, full_name`,
            [insertedClient.id, record.email, record.fullName, record.passwordHash]
        );
        const insertedUser = insertedUserRes.rows[0];

        await connection.query(
            `INSERT INTO client_branding (client_id, logo_url, primary_color, secondary_color, font_family)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                insertedClient.id,
                null,
                record.defaultBranding.primaryColor,
                record.defaultBranding.secondaryColor,
                record.defaultBranding.fontFamily
            ]
        );

        const insertedConfigVersionRes = await connection.query<{ id: number; version_number: number }>(
            `INSERT INTO client_config_versions (client_id, version_number, estimator_config, created_by_client_user_id)
             VALUES ($1, 1, $2, $3)
             RETURNING id, version_number`,
            [insertedClient.id, record.defaultEstimatorConfig, insertedUser.id]
        );
        const insertedConfigVersion = insertedConfigVersionRes.rows[0];

        await connection.query('UPDATE clients SET active_config_version_id = $1 WHERE id = $2', [
            insertedConfigVersion.id,
            insertedClient.id
        ]);

        await insertAuditLog(connection, {
            clientId: insertedClient.id,
            actorClientUserId: insertedUser.id,
            action: 'config_version_created',
            entityType: 'client_config_version',
            entityId: insertedConfigVersion.id,
            metadata: {
                versionNumber: insertedConfigVersion.version_number,
                source: 'self_serve_signup',
                previousActiveConfigVersionId: null
            }
        });

        await insertAuditLog(connection, {
            clientId: insertedClient.id,
            actorClientUserId: insertedUser.id,
            action: 'config_version_activated',
            entityType: 'client_config_version',
            entityId: insertedConfigVersion.id,
            metadata: {
                versionNumber: insertedConfigVersion.version_number,
                source: 'self_serve_signup',
                previousActiveConfigVersionId: null,
                newActiveConfigVersionId: insertedConfigVersion.id
            }
        });

        await insertAuditLog(connection, {
            clientId: insertedClient.id,
            actorClientUserId: insertedUser.id,
            action: 'portal_signup_completed',
            entityType: 'client',
            entityId: insertedClient.id,
            metadata: {
                source: 'self_serve_signup',
                initialConfigVersionId: insertedConfigVersion.id
            }
        });

        await connection.query(
            `INSERT INTO client_sessions (client_user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [insertedUser.id, record.sessionTokenHash, record.sessionExpiresAt]
        );

        await connection.query('COMMIT');

        return {
            client: {
                id: insertedClient.id,
                name: insertedClient.name
            },
            user: {
                id: insertedUser.id,
                email: insertedUser.email,
                fullName: insertedUser.full_name
            }
        };
    } catch (error) {
        await connection.query('ROLLBACK');

        if (isClientNameUniqueViolation(error)) {
            throw new ConflictError('That company ID is unavailable', 'client_id_unavailable');
        }

        throw error;
    } finally {
        connection.release();
    }
}

function isClientNameUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
    const constraint = 'constraint' in error ? String((error as { constraint?: unknown }).constraint ?? '') : '';
    const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';

    return (
        code === '23505' ||
        constraint.includes('clients_name') ||
        (/duplicate/i.test(message) && /clients/i.test(message) && /name/i.test(message))
    );
}

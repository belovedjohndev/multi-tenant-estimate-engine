import { Client } from '../domain/client';
import { ClientSettings, ClientConfigHistoryEntry } from '../domain/clientSettings';
import { ClientBranding } from '../domain/clientBranding';
import { ClientConfig } from '../domain/clientConfig';
import { EstimatorConfig, parseEstimatorConfigRecord } from '../domain/estimate';
import { insertAuditLog } from './auditLogRepository';
import { pool } from './database';

interface ClientRow {
    id: number;
    name: string;
    company_name: string;
    phone: string | null;
    notification_email: string | null;
    active_config_version_id: number;
    created_at: Date;
}

interface ClientBrandingRow {
    id: number;
    client_id: number;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    font_family: string | null;
    created_at: Date;
}

interface ClientConfigVersionRow {
    id: number;
    client_id: number;
    version_number: number;
    estimator_config: unknown;
    created_by_client_user_id: number | null;
    created_at: Date;
}

interface ClientConfigHistoryRow extends ClientConfigVersionRow {
    created_by_email: string | null;
}

export async function findClientIdByName(clientName: string): Promise<number | null> {
    const client = await findClientByName(clientName);

    return client?.id ?? null;
}

export async function findClientByName(clientName: string): Promise<Client | null> {
    const clientRes = await pool.query<ClientRow>(
        'SELECT id, name, company_name, phone, notification_email, active_config_version_id, created_at FROM clients WHERE name = $1',
        [clientName]
    );

    return clientRes.rows[0] ? mapClientRow(clientRes.rows[0]) : null;
}

export async function findClientById(clientId: number): Promise<Client | null> {
    const clientRes = await pool.query<ClientRow>(
        'SELECT id, name, company_name, phone, notification_email, active_config_version_id, created_at FROM clients WHERE id = $1',
        [clientId]
    );

    return clientRes.rows[0] ? mapClientRow(clientRes.rows[0]) : null;
}

export async function getClientConfiguration(clientId: number): Promise<{
    branding: ClientBranding | null;
    config: ClientConfig | null;
}> {
    const client = await findClientById(clientId);

    if (!client) {
        return {
            branding: null,
            config: null
        };
    }

    const [branding, config] = await Promise.all([
        getClientBranding(clientId),
        getClientConfigVersionById(client.activeConfigVersionId)
    ]);

    return {
        branding,
        config
    };
}

export async function findClientConfigVersionById(clientId: number, configVersionId: number): Promise<ClientConfig | null> {
    const configRes = await pool.query<ClientConfigVersionRow>(
        `SELECT id, client_id, version_number, estimator_config, created_by_client_user_id, created_at
         FROM client_config_versions
         WHERE client_id = $1 AND id = $2`,
        [clientId, configVersionId]
    );

    return configRes.rows[0] ? mapConfigVersionRow(configRes.rows[0]) : null;
}

export async function getClientBranding(clientId: number): Promise<ClientBranding | null> {
    const brandingRes = await pool.query<ClientBrandingRow>('SELECT * FROM client_branding WHERE client_id = $1', [clientId]);

    return brandingRes.rows[0] ? mapBrandingRow(brandingRes.rows[0]) : null;
}

export async function getClientSettings(clientId: number): Promise<ClientSettings> {
    const client = await findClientById(clientId);

    if (!client) {
        throw new Error('Client not found');
    }

    const [branding, activeConfig, configHistory] = await Promise.all([
        getClientBranding(clientId),
        getClientConfigVersionById(client.activeConfigVersionId),
        listClientConfigHistory(clientId)
    ]);

    if (!activeConfig) {
        throw new Error('Client config not found');
    }

    return {
        clientId: client.name,
        companyName: client.companyName,
        logoUrl: branding?.logoUrl,
        phone: client.phone,
        notificationEmail: client.notificationEmail,
        estimatorConfig: activeConfig.estimatorConfig,
        currentConfigVersion: {
            id: activeConfig.id,
            versionNumber: activeConfig.versionNumber,
            createdAt: activeConfig.createdAt.toISOString()
        },
        configHistory
    };
}

export async function updateClientSettings(
    clientId: number,
    settings: Omit<ClientSettings, 'clientId' | 'currentConfigVersion' | 'configHistory'>,
    actorClientUserId?: number
): Promise<ClientSettings> {
    const connection = await pool.connect();

    try {
        await connection.query('BEGIN');

        const clientRes = await connection.query<ClientRow>(
            `SELECT id, name, company_name, phone, notification_email, active_config_version_id, created_at
             FROM clients
             WHERE id = $1
             FOR UPDATE`,
            [clientId]
        );

        const clientRow = clientRes.rows[0];

        if (!clientRow) {
            throw new Error('Client not found');
        }

        const activeConfigRes = await connection.query<ClientConfigVersionRow>(
            `SELECT id, client_id, version_number, estimator_config, created_by_client_user_id, created_at
             FROM client_config_versions
             WHERE id = $1`,
            [clientRow.active_config_version_id]
        );

        const activeConfigRow = activeConfigRes.rows[0];

        if (!activeConfigRow) {
            throw new Error('Active config version not found');
        }

        const currentEstimatorConfig = parseEstimatorConfigRecord(
            activeConfigRow.estimator_config,
            'client_config_versions.estimator_config'
        );
        const nextEstimatorConfig = parseEstimatorConfigRecord(settings.estimatorConfig, 'estimatorConfig');
        const configChanged = !areEstimatorConfigsEqual(currentEstimatorConfig, nextEstimatorConfig);

        await connection.query(
            `UPDATE clients
             SET company_name = $1, phone = $2, notification_email = $3
             WHERE id = $4`,
            [settings.companyName, settings.phone ?? null, settings.notificationEmail ?? null, clientId]
        );

        await connection.query(
            `INSERT INTO client_branding (client_id, logo_url)
             VALUES ($1, $2)
             ON CONFLICT (client_id)
             DO UPDATE SET logo_url = EXCLUDED.logo_url`,
            [clientId, settings.logoUrl ?? null]
        );

        if (configChanged) {
            const nextVersionRes = await connection.query<{ next_version_number: string }>(
                'SELECT (COALESCE(MAX(version_number), 0) + 1)::text AS next_version_number FROM client_config_versions WHERE client_id = $1',
                [clientId]
            );

            const nextVersionNumber = Number.parseInt(nextVersionRes.rows[0].next_version_number, 10);
            const insertedVersionRes = await connection.query<ClientConfigVersionRow>(
                `INSERT INTO client_config_versions (client_id, version_number, estimator_config, created_by_client_user_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, client_id, version_number, estimator_config, created_by_client_user_id, created_at`,
                [clientId, nextVersionNumber, nextEstimatorConfig, actorClientUserId ?? null]
            );

            const insertedVersion = insertedVersionRes.rows[0];

            await insertAuditLog(connection, {
                clientId,
                actorClientUserId,
                action: 'config_version_created',
                entityType: 'client_config_version',
                entityId: insertedVersion.id,
                metadata: {
                    versionNumber: insertedVersion.version_number,
                    previousActiveConfigVersionId: activeConfigRow.id
                }
            });

            await connection.query('UPDATE clients SET active_config_version_id = $1 WHERE id = $2', [insertedVersion.id, clientId]);

            await insertAuditLog(connection, {
                clientId,
                actorClientUserId,
                action: 'config_version_activated',
                entityType: 'client_config_version',
                entityId: insertedVersion.id,
                metadata: {
                    versionNumber: insertedVersion.version_number,
                    previousActiveConfigVersionId: activeConfigRow.id,
                    newActiveConfigVersionId: insertedVersion.id
                }
            });
        }

        await connection.query('COMMIT');
    } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
    } finally {
        connection.release();
    }

    return getClientSettings(clientId);
}

async function getClientConfigVersionById(configVersionId: number): Promise<ClientConfig | null> {
    const configRes = await pool.query<ClientConfigVersionRow>(
        `SELECT id, client_id, version_number, estimator_config, created_by_client_user_id, created_at
         FROM client_config_versions
         WHERE id = $1`,
        [configVersionId]
    );

    return configRes.rows[0] ? mapConfigVersionRow(configRes.rows[0]) : null;
}

async function listClientConfigHistory(clientId: number): Promise<ClientConfigHistoryEntry[]> {
    const historyRes = await pool.query<ClientConfigHistoryRow>(
        `SELECT
             v.id,
             v.client_id,
             v.version_number,
             v.estimator_config,
             v.created_by_client_user_id,
             v.created_at,
             u.email AS created_by_email
         FROM client_config_versions v
         LEFT JOIN client_users u ON u.id = v.created_by_client_user_id
         WHERE v.client_id = $1
         ORDER BY v.version_number DESC
         LIMIT 10`,
        [clientId]
    );

    const client = await findClientById(clientId);

    if (!client) {
        return [];
    }

    return historyRes.rows.map((row) => ({
        id: row.id,
        versionNumber: row.version_number,
        createdAt: row.created_at.toISOString(),
        isActive: row.id === client.activeConfigVersionId,
        createdByEmail: row.created_by_email ?? undefined
    }));
}

function mapBrandingRow(row: ClientBrandingRow): ClientBranding {
    return {
        id: row.id,
        clientId: row.client_id,
        logoUrl: row.logo_url ?? undefined,
        primaryColor: row.primary_color ?? undefined,
        secondaryColor: row.secondary_color ?? undefined,
        fontFamily: row.font_family ?? undefined,
        createdAt: row.created_at
    };
}

function mapClientRow(row: ClientRow): Client {
    return {
        id: row.id,
        name: row.name,
        companyName: row.company_name,
        phone: row.phone ?? undefined,
        notificationEmail: row.notification_email ?? undefined,
        activeConfigVersionId: row.active_config_version_id,
        createdAt: row.created_at
    };
}

function mapConfigVersionRow(row: ClientConfigVersionRow): ClientConfig {
    return {
        id: row.id,
        clientId: row.client_id,
        versionNumber: row.version_number,
        estimatorConfig: parseEstimatorConfigRecord(row.estimator_config, 'client_config_versions.estimator_config'),
        createdByClientUserId: row.created_by_client_user_id ?? undefined,
        createdAt: row.created_at
    };
}

function areEstimatorConfigsEqual(left: EstimatorConfig, right: EstimatorConfig): boolean {
    return stableSerialize(left) === stableSerialize(right);
}

function stableSerialize(value: unknown): string {
    return JSON.stringify(normalizeForComparison(value));
}

function normalizeForComparison(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(normalizeForComparison);
    }

    if (value && typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>)
            .sort()
            .reduce<Record<string, unknown>>((accumulator, key) => {
                accumulator[key] = normalizeForComparison((value as Record<string, unknown>)[key]);
                return accumulator;
            }, {});
    }

    return value;
}

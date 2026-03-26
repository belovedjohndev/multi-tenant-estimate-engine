import { Client } from '../domain/client';
import { ClientSettings } from '../domain/clientSettings';
import { ClientBranding } from '../domain/clientBranding';
import { ClientConfig } from '../domain/clientConfig';
import { parseEstimatorConfigRecord } from '../domain/estimate';
import { pool } from './database';

interface ClientRow {
    id: number;
    name: string;
    company_name: string;
    phone: string | null;
    notification_email: string | null;
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

interface ClientConfigRow {
    id: number;
    client_id: number;
    estimator_config: unknown;
    created_at: Date;
}

export async function findClientIdByName(clientName: string): Promise<number | null> {
    const client = await findClientByName(clientName);

    return client?.id ?? null;
}

export async function findClientByName(clientName: string): Promise<Client | null> {
    const clientRes = await pool.query<ClientRow>(
        'SELECT id, name, company_name, phone, notification_email, created_at FROM clients WHERE name = $1',
        [clientName]
    );

    return clientRes.rows[0] ? mapClientRow(clientRes.rows[0]) : null;
}

export async function findClientById(clientId: number): Promise<Client | null> {
    const clientRes = await pool.query<ClientRow>(
        'SELECT id, name, company_name, phone, notification_email, created_at FROM clients WHERE id = $1',
        [clientId]
    );

    return clientRes.rows[0] ? mapClientRow(clientRes.rows[0]) : null;
}

export async function getClientConfiguration(clientId: number): Promise<{
    branding: ClientBranding | null;
    config: ClientConfig | null;
}> {
    const [brandingRes, configRes] = await Promise.all([
        pool.query<ClientBrandingRow>('SELECT * FROM client_branding WHERE client_id = $1', [clientId]),
        pool.query<ClientConfigRow>('SELECT * FROM client_config WHERE client_id = $1', [clientId])
    ]);

    return {
        branding: brandingRes.rows[0] ? mapBrandingRow(brandingRes.rows[0]) : null,
        config: configRes.rows[0] ? mapConfigRow(configRes.rows[0]) : null
    };
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

    const [branding, config] = await Promise.all([
        getClientBranding(clientId),
        getClientConfiguration(clientId).then((result) => result.config)
    ]);

    if (!config) {
        throw new Error('Client config not found');
    }

    return {
        clientId: client.name,
        companyName: client.companyName,
        logoUrl: branding?.logoUrl,
        phone: client.phone,
        notificationEmail: client.notificationEmail,
        estimatorConfig: config.estimatorConfig
    };
}

export async function updateClientSettings(
    clientId: number,
    settings: Omit<ClientSettings, 'clientId'>
): Promise<ClientSettings> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(
            `UPDATE clients
             SET company_name = $1, phone = $2, notification_email = $3
             WHERE id = $4`,
            [settings.companyName, settings.phone ?? null, settings.notificationEmail ?? null, clientId]
        );

        await client.query(
            `INSERT INTO client_branding (client_id, logo_url)
             VALUES ($1, $2)
             ON CONFLICT (client_id)
             DO UPDATE SET logo_url = EXCLUDED.logo_url`,
            [clientId, settings.logoUrl ?? null]
        );

        await client.query(
            `INSERT INTO client_config (client_id, estimator_config)
             VALUES ($1, $2)
             ON CONFLICT (client_id)
             DO UPDATE SET estimator_config = EXCLUDED.estimator_config`,
            [clientId, settings.estimatorConfig]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return getClientSettings(clientId);
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
        createdAt: row.created_at
    };
}

function mapConfigRow(row: ClientConfigRow): ClientConfig {
    return {
        id: row.id,
        clientId: row.client_id,
        estimatorConfig: parseEstimatorConfigRecord(row.estimator_config, 'client_config.estimator_config'),
        createdAt: row.created_at
    };
}

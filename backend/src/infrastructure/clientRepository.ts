import { ClientBranding } from '../domain/clientBranding';
import { ClientConfig } from '../domain/clientConfig';
import { EstimatorConfig } from '../domain/estimate';
import { pool } from './database';

interface ClientRow {
    id: number;
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
    const clientRes = await pool.query<ClientRow>('SELECT id FROM clients WHERE name = $1', [clientName]);

    return clientRes.rows[0]?.id ?? null;
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

function mapConfigRow(row: ClientConfigRow): ClientConfig {
    return {
        id: row.id,
        clientId: row.client_id,
        estimatorConfig: parseEstimatorConfig(row.estimator_config),
        createdAt: row.created_at
    };
}

function parseEstimatorConfig(value: unknown): EstimatorConfig {
    const config = requireObject(value, 'client_config.estimator_config must be an object');
    const multipliers = requireObject(config.multipliers, 'client_config.estimator_config.multipliers must be an object');
    const discounts = requireObject(config.discounts, 'client_config.estimator_config.discounts must be an object');

    return {
        basePrice: requireNumber(config.basePrice, 'client_config.estimator_config.basePrice must be a number'),
        multipliers: {
            size: requireNumber(multipliers.size, 'client_config.estimator_config.multipliers.size must be a number'),
            complexity: requireNumber(
                multipliers.complexity,
                'client_config.estimator_config.multipliers.complexity must be a number'
            )
        },
        discounts: {
            bulk: requireNumber(discounts.bulk, 'client_config.estimator_config.discounts.bulk must be a number')
        }
    };
}

function requireObject(value: unknown, message: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(message);
    }

    return value as Record<string, unknown>;
}

function requireNumber(value: unknown, message: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(message);
    }

    return value;
}

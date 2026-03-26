import { DashboardLead, DashboardLeadSummary } from '../domain/dashboard';
import { EstimateInput, EstimateResponse } from '../domain/estimate';
import { pool } from './database';

export interface NewLeadRecord {
    clientId: number;
    configVersionId: number;
    name?: string;
    email: string;
    phone?: string;
    estimateInput: EstimateInput;
    estimateData: EstimateResponse;
}

interface InsertLeadRow {
    id: number;
}

interface DashboardLeadRow {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    config_version_id: number;
    config_version_number: number;
    estimate_input: unknown;
    estimate_data: unknown;
    created_at: Date;
}

interface DashboardLeadSummaryRow {
    total_lead_count: string;
    average_estimate_total: string | null;
    latest_lead_created_at: Date | null;
}

export async function insertLead(record: NewLeadRecord): Promise<number> {
    const insertRes = await pool.query<InsertLeadRow>(
        'INSERT INTO leads (client_id, config_version_id, name, email, phone, estimate_input, estimate_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [record.clientId, record.configVersionId, record.name, record.email, record.phone, record.estimateInput, record.estimateData]
    );

    return insertRes.rows[0].id;
}

export async function listDashboardLeadsByClientId(clientId: number, limit: number): Promise<DashboardLead[]> {
    const result = await pool.query<DashboardLeadRow>(
        `SELECT
             leads.id,
             leads.name,
             leads.email,
             leads.phone,
             leads.config_version_id,
             client_config_versions.version_number AS config_version_number,
             leads.estimate_input,
             leads.estimate_data,
             leads.created_at
         FROM leads
         JOIN client_config_versions ON client_config_versions.id = leads.config_version_id
         WHERE leads.client_id = $1
         ORDER BY leads.created_at DESC
         LIMIT $2`,
        [clientId, limit]
    );

    return result.rows.map(mapDashboardLeadRow);
}

export async function summarizeDashboardLeadsByClientId(clientId: number): Promise<DashboardLeadSummary> {
    const result = await pool.query<DashboardLeadSummaryRow>(
        `SELECT
             COUNT(*)::text AS total_lead_count,
             AVG((estimate_data->>'total')::numeric)::text AS average_estimate_total,
             MAX(created_at) AS latest_lead_created_at
         FROM leads
         WHERE client_id = $1`,
        [clientId]
    );

    const row = result.rows[0];

    return {
        totalLeadCount: Number.parseInt(row.total_lead_count, 10),
        averageEstimateTotal: row.average_estimate_total ? Number.parseFloat(row.average_estimate_total) : null,
        latestLeadCreatedAt: row.latest_lead_created_at
    };
}

function mapDashboardLeadRow(row: DashboardLeadRow): DashboardLead {
    return {
        id: row.id,
        name: row.name ?? undefined,
        email: row.email,
        phone: row.phone ?? undefined,
        configVersionId: row.config_version_id,
        configVersionNumber: row.config_version_number,
        estimateInput: row.estimate_input ? parseEstimateInput(row.estimate_input) : undefined,
        estimateData: parseEstimateData(row.estimate_data, {
            id: row.config_version_id,
            versionNumber: row.config_version_number
        }),
        createdAt: row.created_at
    };
}

function parseEstimateInput(value: unknown): EstimateInput {
    const input = requireObject(value, 'lead.estimate_input must be an object');
    const parsedInput: EstimateInput = {};

    if (input.size !== undefined) {
        parsedInput.size = requireNumber(input.size, 'lead.estimate_input.size must be a number');
    }

    if (input.complexity !== undefined) {
        if (input.complexity !== 'low' && input.complexity !== 'medium' && input.complexity !== 'high') {
            throw new Error('lead.estimate_input.complexity must be low, medium, or high');
        }
        parsedInput.complexity = input.complexity;
    }

    if (input.bulk !== undefined) {
        if (typeof input.bulk !== 'boolean') {
            throw new Error('lead.estimate_input.bulk must be a boolean');
        }
        parsedInput.bulk = input.bulk;
    }

    return parsedInput;
}

function parseEstimateData(
    value: unknown,
    fallbackConfigVersion: { id: number; versionNumber: number }
): EstimateResponse {
    const estimateData = requireObject(value, 'lead.estimate_data must be an object');
    const breakdown = requireObject(estimateData.breakdown, 'lead.estimate_data.breakdown must be an object');
    const configVersion = isRecord(estimateData.configVersion) ? estimateData.configVersion : null;

    return {
        total: requireNumber(estimateData.total, 'lead.estimate_data.total must be a number'),
        breakdown: {
            basePrice: requireNumber(breakdown.basePrice, 'lead.estimate_data.breakdown.basePrice must be a number'),
            sizeMultiplier: requireNumber(
                breakdown.sizeMultiplier,
                'lead.estimate_data.breakdown.sizeMultiplier must be a number'
            ),
            complexityMultiplier: requireNumber(
                breakdown.complexityMultiplier,
                'lead.estimate_data.breakdown.complexityMultiplier must be a number'
            ),
            discount: requireNumber(breakdown.discount, 'lead.estimate_data.breakdown.discount must be a number')
        },
        configVersion: {
            id:
                configVersion && typeof configVersion.id === 'number' && Number.isFinite(configVersion.id)
                    ? configVersion.id
                    : fallbackConfigVersion.id,
            versionNumber:
                configVersion &&
                typeof configVersion.versionNumber === 'number' &&
                Number.isFinite(configVersion.versionNumber)
                    ? configVersion.versionNumber
                    : fallbackConfigVersion.versionNumber
        }
    };
}

function requireObject(value: unknown, message: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(message);
    }

    return value as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireNumber(value: unknown, message: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(message);
    }

    return value;
}

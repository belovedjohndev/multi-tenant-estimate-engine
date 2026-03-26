import { DashboardLead, DashboardLeadSummary } from '../domain/dashboard';
import { EstimateInput, EstimateResponse } from '../domain/estimate';
import { pool } from './database';

export interface NewLeadRecord {
    clientId: number;
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
        'INSERT INTO leads (client_id, name, email, phone, estimate_input, estimate_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [record.clientId, record.name, record.email, record.phone, record.estimateInput, record.estimateData]
    );

    return insertRes.rows[0].id;
}

export async function listDashboardLeadsByClientId(clientId: number, limit: number): Promise<DashboardLead[]> {
    const result = await pool.query<DashboardLeadRow>(
        `SELECT id, name, email, phone, estimate_input, estimate_data, created_at
         FROM leads
         WHERE client_id = $1
         ORDER BY created_at DESC
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
        estimateInput: row.estimate_input ? parseEstimateInput(row.estimate_input) : undefined,
        estimateData: parseEstimateData(row.estimate_data),
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

function parseEstimateData(value: unknown): EstimateResponse {
    const estimateData = requireObject(value, 'lead.estimate_data must be an object');
    const breakdown = requireObject(estimateData.breakdown, 'lead.estimate_data.breakdown must be an object');

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

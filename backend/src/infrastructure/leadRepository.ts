import { EstimateResponse } from '../domain/estimate';
import { pool } from './database';

export interface NewLeadRecord {
    clientId: number;
    name?: string;
    email: string;
    phone?: string;
    estimateData: EstimateResponse;
}

interface InsertLeadRow {
    id: number;
}

export async function insertLead(record: NewLeadRecord): Promise<number> {
    const insertRes = await pool.query<InsertLeadRow>(
        'INSERT INTO leads (client_id, name, email, phone, estimate_data) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [record.clientId, record.name, record.email, record.phone, record.estimateData]
    );

    return insertRes.rows[0].id;
}

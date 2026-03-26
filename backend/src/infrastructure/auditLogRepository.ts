import { pool } from './database';

export interface NewAuditLogRecord {
    clientId: number;
    actorClientUserId?: number;
    action: string;
    entityType: string;
    entityId?: number;
    metadata: Record<string, unknown>;
}

export async function insertAuditLog(clientConnection: typeof pool | { query: typeof pool.query }, record: NewAuditLogRecord) {
    await clientConnection.query(
        `INSERT INTO audit_logs (client_id, actor_client_user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            record.clientId,
            record.actorClientUserId ?? null,
            record.action,
            record.entityType,
            record.entityId ?? null,
            record.metadata
        ]
    );
}

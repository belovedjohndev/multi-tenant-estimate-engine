export interface AuditLog {
    id: number;
    clientId: number;
    actorClientUserId?: number;
    action: string;
    entityType: string;
    entityId?: number;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

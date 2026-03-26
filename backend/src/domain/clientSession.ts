export interface ClientSession {
    id: number;
    clientUserId: number;
    tokenHash: string;
    expiresAt: Date;
    revokedAt?: Date;
    createdAt: Date;
    lastSeenAt: Date;
}

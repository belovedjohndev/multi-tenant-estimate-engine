export interface ClientUser {
    id: number;
    clientId: number;
    email: string;
    fullName: string;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt?: Date;
}

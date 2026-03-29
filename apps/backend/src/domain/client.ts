export interface Client {
    id: number;
    name: string;
    companyName: string;
    phone?: string;
    notificationEmail?: string;
    activeConfigVersionId: number;
    createdAt: Date;
}

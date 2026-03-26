import { DashboardLead, DashboardLeadSummary } from '../domain/dashboard';
import { listDashboardLeadsByClientId, summarizeDashboardLeadsByClientId } from '../infrastructure/leadRepository';

export interface PortalLeadsResult {
    summary: {
        totalLeadCount: number;
        averageEstimateTotal: number | null;
        latestLeadCreatedAt: string | null;
    };
    leads: Array<{
        id: number;
        name?: string;
        email: string;
        phone?: string;
        estimateInput?: {
            size?: number;
            complexity?: 'low' | 'medium' | 'high';
            bulk?: boolean;
        };
        estimateData: {
            total: number;
            breakdown: {
                basePrice: number;
                sizeMultiplier: number;
                complexityMultiplier: number;
                discount: number;
            };
        };
        createdAt: string;
    }>;
}

export async function listPortalLeads(clientId: number, limit: number): Promise<PortalLeadsResult> {
    const [summary, leads] = await Promise.all([
        summarizeDashboardLeadsByClientId(clientId),
        listDashboardLeadsByClientId(clientId, limit)
    ]);

    return {
        summary: mapSummary(summary),
        leads: leads.map(mapLead)
    };
}

function mapSummary(summary: DashboardLeadSummary): PortalLeadsResult['summary'] {
    return {
        totalLeadCount: summary.totalLeadCount,
        averageEstimateTotal: summary.averageEstimateTotal,
        latestLeadCreatedAt: summary.latestLeadCreatedAt ? summary.latestLeadCreatedAt.toISOString() : null
    };
}

function mapLead(lead: DashboardLead): PortalLeadsResult['leads'][number] {
    return {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        estimateInput: lead.estimateInput,
        estimateData: lead.estimateData,
        createdAt: lead.createdAt.toISOString()
    };
}

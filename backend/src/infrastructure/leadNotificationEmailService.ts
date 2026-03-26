import { request as httpsRequest } from 'node:https';
import { Client } from '../domain/client';
import { EstimateInput, EstimateResponse } from '../domain/estimate';

interface LeadCreatedNotificationRequest {
    leadId: number;
    client: Client;
    lead: {
        name?: string;
        email: string;
        phone?: string;
        estimateInput: EstimateInput;
        estimateData: EstimateResponse;
    };
}

interface ResendSendEmailPayload {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
    tags: Array<{
        name: string;
        value: string;
    }>;
}

interface HttpResponse {
    statusCode: number;
    body: string;
}

const RESEND_API_HOST = 'api.resend.com';
const RESEND_API_PATH = '/emails';

export async function sendLeadCreatedNotification(request: LeadCreatedNotificationRequest): Promise<void> {
    const recipientEmail = request.client.notificationEmail?.trim();

    if (!recipientEmail) {
        return;
    }

    const resendApiKey = readOptionalEnv('RESEND_API_KEY');
    const fromEmail = readOptionalEnv('LEAD_NOTIFICATION_FROM_EMAIL');

    if (!resendApiKey || !fromEmail) {
        console.warn(
            `Lead notification skipped for client "${request.client.name}" because RESEND_API_KEY or LEAD_NOTIFICATION_FROM_EMAIL is not configured.`
        );
        return;
    }

    const payload = buildResendPayload(request, fromEmail, recipientEmail);
    const response = await postJson(
        {
            hostname: RESEND_API_HOST,
            path: RESEND_API_PATH,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': `lead-created-${request.leadId}`
            }
        },
        payload
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Resend email API returned ${response.statusCode}: ${response.body}`);
    }
}

function buildResendPayload(
    request: LeadCreatedNotificationRequest,
    fromEmail: string,
    recipientEmail: string
): ResendSendEmailPayload {
    const subject = `New estimate lead for ${request.client.name}`;

    return {
        from: fromEmail,
        to: [recipientEmail],
        subject,
        html: buildHtmlBody(request),
        text: buildTextBody(request),
        tags: [
            { name: 'event', value: 'lead_created' },
            { name: 'client', value: sanitizeTagValue(request.client.name) }
        ]
    };
}

function buildHtmlBody(request: LeadCreatedNotificationRequest): string {
    const leadName = escapeHtml(request.lead.name?.trim() || 'Not provided');
    const leadEmail = escapeHtml(request.lead.email);
    const leadPhone = escapeHtml(request.lead.phone?.trim() || 'Not provided');
    const estimateTotal = escapeHtml(formatCurrency(request.lead.estimateData.total));
    const inputSummary = buildInputRows(request.lead.estimateInput)
        .map(({ label, value }) => `<tr><td style="padding:6px 12px 6px 0;font-weight:600;">${escapeHtml(label)}</td><td style="padding:6px 0;">${escapeHtml(value)}</td></tr>`)
        .join('');
    const breakdownSummary = buildBreakdownRows(request.lead.estimateData)
        .map(({ label, value }) => `<tr><td style="padding:6px 12px 6px 0;font-weight:600;">${escapeHtml(label)}</td><td style="padding:6px 0;">${escapeHtml(value)}</td></tr>`)
        .join('');

    return `
<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
  <h2 style="margin-bottom:8px;">New lead captured for ${escapeHtml(request.client.name)}</h2>
  <p style="margin-top:0;">Lead #${request.leadId} has completed the estimate flow.</p>
  <h3>Contact</h3>
  <table style="border-collapse:collapse;">
    <tr><td style="padding:6px 12px 6px 0;font-weight:600;">Name</td><td style="padding:6px 0;">${leadName}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;font-weight:600;">Email</td><td style="padding:6px 0;">${leadEmail}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;font-weight:600;">Phone</td><td style="padding:6px 0;">${leadPhone}</td></tr>
  </table>
  <h3>Estimate</h3>
  <table style="border-collapse:collapse;">
    <tr><td style="padding:6px 12px 6px 0;font-weight:600;">Total</td><td style="padding:6px 0;">${estimateTotal}</td></tr>
    ${breakdownSummary}
  </table>
  <h3>Estimate Inputs</h3>
  <table style="border-collapse:collapse;">
    ${inputSummary}
  </table>
</div>`.trim();
}

function buildTextBody(request: LeadCreatedNotificationRequest): string {
    const lines = [
        `New lead captured for ${request.client.name}`,
        `Lead ID: ${request.leadId}`,
        '',
        'Contact',
        `Name: ${request.lead.name?.trim() || 'Not provided'}`,
        `Email: ${request.lead.email}`,
        `Phone: ${request.lead.phone?.trim() || 'Not provided'}`,
        '',
        'Estimate',
        `Total: ${formatCurrency(request.lead.estimateData.total)}`,
        ...buildBreakdownRows(request.lead.estimateData).map((row) => `${row.label}: ${row.value}`),
        '',
        'Estimate Inputs',
        ...buildInputRows(request.lead.estimateInput).map((row) => `${row.label}: ${row.value}`)
    ];

    return lines.join('\n');
}

function buildInputRows(input: EstimateInput): Array<{ label: string; value: string }> {
    return [
        { label: 'Size', value: input.size !== undefined ? String(input.size) : 'Not provided' },
        { label: 'Complexity', value: input.complexity ?? 'Not provided' },
        { label: 'Bulk', value: input.bulk === undefined ? 'Not provided' : input.bulk ? 'Yes' : 'No' }
    ];
}

function buildBreakdownRows(estimate: EstimateResponse): Array<{ label: string; value: string }> {
    return [
        { label: 'Base Price', value: formatCurrency(estimate.breakdown.basePrice) },
        { label: 'Size Multiplier', value: formatNumber(estimate.breakdown.sizeMultiplier) },
        { label: 'Complexity Multiplier', value: formatNumber(estimate.breakdown.complexityMultiplier) },
        { label: 'Discount', value: `${formatNumber(estimate.breakdown.discount * 100)}%` }
    ];
}

function postJson(
    options: {
        hostname: string;
        path: string;
        method: 'POST';
        headers: Record<string, string>;
    },
    payload: ResendSendEmailPayload
): Promise<HttpResponse> {
    const requestBody = JSON.stringify(payload);

    return new Promise<HttpResponse>((resolve, reject) => {
        const req = httpsRequest(
            {
                ...options,
                headers: {
                    ...options.headers,
                    'Content-Length': Buffer.byteLength(requestBody).toString()
                }
            },
            (res) => {
                const chunks: Buffer[] = [];

                res.on('data', (chunk) => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode ?? 500,
                        body: Buffer.concat(chunks).toString('utf8')
                    });
                });
            }
        );

        req.setTimeout(readTimeoutMs(), () => {
            req.destroy(new Error('Lead notification email request timed out'));
        });
        req.on('error', reject);
        req.write(requestBody);
        req.end();
    });
}

function readOptionalEnv(name: 'LEAD_NOTIFICATION_FROM_EMAIL' | 'RESEND_API_KEY'): string | undefined {
    const value = process.env[name];

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue || undefined;
}

function readTimeoutMs(): number {
    const rawValue = process.env.LEAD_NOTIFICATION_TIMEOUT_MS;

    if (!rawValue) {
        return 5000;
    }

    const parsedValue = Number.parseInt(rawValue, 10);

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error('LEAD_NOTIFICATION_TIMEOUT_MS must be a positive integer when provided');
    }

    return parsedValue;
}

function formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
    if (Number.isInteger(value)) {
        return String(value);
    }

    return value.toFixed(2);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeTagValue(value: string): string {
    const sanitized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');

    return sanitized.slice(0, 64) || 'unknown_client';
}

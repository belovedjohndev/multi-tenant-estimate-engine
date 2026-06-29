import {
    ClientConfigData,
    createLead,
    EstimateComplexity,
    EstimateInput,
    EstimateResult,
    fetchClientConfig,
    requestEstimate
} from '../../api/estimateApi';
import { formatCurrency } from '../../shared/format';
import { escapeHtmlAttribute } from '../../shared/html';
import { buildEstimateResultMarkup, buildLeadCaptureMarkup } from './estimateDemoMarkup';

interface EstimateDemoConfig {
    apiBaseUrl: string;
    clientId: string;
    portalUrl: string;
}

let clientConfigPromise: Promise<ClientConfigData> | null = null;
let activeEstimateInput: EstimateInput | null = null;
let activeEstimateResult: EstimateResult | null = null;

export function initializeEstimateDemo(config: EstimateDemoConfig): void {
    const form = document.getElementById('estimate-demo-form');
    const status = document.getElementById('estimate-demo-status');
    const resultRegion = document.getElementById('estimate-demo-result');
    const leadRegion = document.getElementById('estimate-demo-lead');
    const configStatus = document.getElementById('estimate-config-status');

    if (
        !(form instanceof HTMLFormElement) ||
        !(status instanceof HTMLElement) ||
        !(resultRegion instanceof HTMLElement) ||
        !(leadRegion instanceof HTMLElement) ||
        !(configStatus instanceof HTMLElement)
    ) {
        return;
    }

    void ensureClientConfig(config)
        .then((clientConfig) => {
            configStatus.textContent = `Demo pricing loaded: base ${formatCurrency(clientConfig.config.estimatorConfig.basePrice)}.`;
        })
        .catch((error) => {
            configStatus.textContent = getErrorMessage(error, 'Demo pricing could not be loaded.');
        });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleEstimateSubmit(config, form, status, resultRegion, leadRegion);
    });
}

async function handleEstimateSubmit(
    config: EstimateDemoConfig,
    form: HTMLFormElement,
    status: HTMLElement,
    resultRegion: HTMLElement,
    leadRegion: HTMLElement
): Promise<void> {
    status.textContent = '';
    resultRegion.innerHTML = '';
    leadRegion.innerHTML = '';
    setFormDisabled(form, true);

    try {
        const input = parseEstimateDemoInput(new FormData(form));
        status.textContent = 'Calculating estimate...';
        await ensureClientConfig(config);
        const result = await requestEstimate(config.apiBaseUrl, config.clientId, input);

        activeEstimateInput = input;
        activeEstimateResult = result;
        status.textContent = '';
        resultRegion.innerHTML = buildEstimateResultMarkup(input, result);
        leadRegion.innerHTML = buildLeadCaptureMarkup(result, config.portalUrl);
        initializeLeadCaptureForm(config, leadRegion);
    } catch (error) {
        status.textContent = getErrorMessage(error, 'Estimate could not be calculated.');
    } finally {
        setFormDisabled(form, false);
    }
}

function initializeLeadCaptureForm(config: EstimateDemoConfig, leadRegion: HTMLElement): void {
    const form = leadRegion.querySelector('#estimate-lead-form');
    const status = leadRegion.querySelector('#estimate-lead-status');

    if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
        return;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleLeadSubmit(config, form, status);
    });
}

async function handleLeadSubmit(config: EstimateDemoConfig, form: HTMLFormElement, status: HTMLElement): Promise<void> {
    if (!activeEstimateInput || !activeEstimateResult) {
        status.textContent = 'Calculate an estimate before sending contact details.';
        return;
    }

    status.textContent = '';
    setFormDisabled(form, true);

    try {
        const formData = new FormData(form);
        const payload = {
            name: parseOptionalString(formData.get('name')),
            email: parseRequiredEmail(formData.get('email')),
            phone: parseOptionalString(formData.get('phone')),
            estimateInput: activeEstimateInput,
            estimateData: activeEstimateResult,
            configVersionId: activeEstimateResult.configVersion.id
        };
        const response = await createLead(config.apiBaseUrl, config.clientId, payload);

        form.innerHTML = `
            <div class="estimate-success">
                <p class="card-label">Request sent</p>
                <h4>Lead #${response.id} was created.</h4>
                <p class="surface-copy">The request used the public lead endpoint and is available to the tenant in the portal.</p>
                <a class="cta-link" href="${escapeHtmlAttribute(config.portalUrl)}">Open Portal</a>
            </div>
        `;
    } catch (error) {
        status.textContent = getErrorMessage(error, 'Contact details could not be submitted.');
        setFormDisabled(form, false);
    }
}

async function ensureClientConfig(config: EstimateDemoConfig): Promise<ClientConfigData> {
    if (!clientConfigPromise) {
        clientConfigPromise = fetchClientConfig(config.apiBaseUrl, config.clientId);
    }

    return clientConfigPromise;
}

function parseEstimateDemoInput(formData: FormData): EstimateInput {
    return {
        size: parsePositiveNumber(formData.get('size'), 'Project size'),
        complexity: parseEstimateComplexity(formData.get('complexity')),
        bulk: formData.get('bulk') === 'on'
    };
}

function parseEstimateComplexity(value: FormDataEntryValue | null): EstimateComplexity {
    if (value === 'low' || value === 'medium' || value === 'high') {
        return value;
    }

    throw new Error('Complexity must be low, medium, or high.');
}

function parsePositiveNumber(value: FormDataEntryValue | null, fieldName: string): number {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} is required.`);
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        throw new Error(`${fieldName} must be a positive number.`);
    }

    return parsedValue;
}

function parseRequiredEmail(value: FormDataEntryValue | null): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Email is required.');
    }

    const email = value.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Email must be a valid email address.');
    }

    return email;
}

function parseOptionalString(value: FormDataEntryValue | null): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue || undefined;
}

function setFormDisabled(form: HTMLFormElement, disabled: boolean): void {
    Array.from(form.elements).forEach((element) => {
        if ('disabled' in element) {
            element.disabled = disabled;
        }
    });
}

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

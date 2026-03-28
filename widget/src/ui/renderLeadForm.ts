import { EstimateResult, LeadCaptureDetails } from '../domain/estimatorTypes';
import { appendChildren, createElement } from '../utils/dom';
import { parseOptionalString, parseRequiredEmail } from '../utils/validation';

export interface LeadFormOptions {
    estimateResult: EstimateResult;
    businessName: string;
    businessPhone?: string;
    initialValue: Partial<LeadCaptureDetails> | null;
    isSubmitting: boolean;
    onBack: () => void;
    onSubmit: (payload: LeadCaptureDetails) => void;
}

export function renderLeadForm(options: LeadFormOptions): HTMLElement {
    const wrapper = createElement('div', { className: 'ee-panel ee-panel-lead' });
    const eyebrow = createElement('p', { className: 'ee-eyebrow', textContent: 'Send your request' });
    const title = createElement('h3', {
        className: 'ee-panel-title',
        textContent: 'Where should we send your estimate?'
    });
    const description = createElement('p', {
        className: 'ee-panel-copy',
        textContent: `Share your details below and ${options.businessName} will receive this estimate request.`
    });
    const helper = createElement('p', {
        className: 'ee-step-helper',
        textContent: `Estimated total ${formatCurrency(options.estimateResult.total)}`
    });
    const summaryCard = createElement('div', { className: 'ee-inline-summary-card' });
    const summaryLabel = createElement('span', {
        className: 'ee-inline-summary-label',
        textContent: `Saved version ${options.estimateResult.configVersion.versionNumber}`
    });
    const summaryValue = createElement('strong', {
        className: 'ee-inline-summary-value',
        textContent: formatCurrency(options.estimateResult.total)
    });
    const contactNote =
        options.businessPhone &&
        createElement('a', {
            className: 'ee-contact-note',
            textContent: `Prefer to talk now? Call ${options.businessPhone}`,
            attributes: {
                href: `tel:${normalizePhoneHref(options.businessPhone)}`
            }
        });

    const form = createElement('form', { className: 'ee-form' });
    const formGrid = createElement('div', { className: 'ee-form-grid' });
    const nameField = createTextField('Name', 'name', options.initialValue?.name ?? '', 'Beloved John', 'text', 'name');
    const emailField = createTextField(
        'Email',
        'email',
        options.initialValue?.email ?? '',
        'belovedjohn@example.com',
        'email',
        'email'
    );
    const phoneField = createTextField('Phone', 'phone', options.initialValue?.phone ?? '', '+123 456 7890', 'tel', 'tel');
    const feedback = createElement('p', { className: 'ee-form-feedback' });
    const actions = createElement('div', { className: 'ee-actions' });
    const backButton = createElement('button', {
        className: 'ee-secondary-action',
        textContent: 'Back',
        attributes: { type: 'button' }
    });
    const submitButton = createElement('button', {
        className: 'ee-primary-action',
        textContent: options.isSubmitting ? 'Sending...' : 'Send Request',
        attributes: { type: 'submit' }
    });

    backButton.disabled = options.isSubmitting;
    submitButton.disabled = options.isSubmitting;
    toggleFormDisabled(form, options.isSubmitting);

    backButton.addEventListener('click', options.onBack);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        feedback.textContent = '';

        try {
            const formData = new FormData(form);
            options.onSubmit({
                name: parseOptionalString(formData.get('name')),
                email: parseRequiredEmail(formData.get('email')),
                phone: parseOptionalString(formData.get('phone'))
            });
        } catch (error) {
            feedback.textContent = error instanceof Error ? error.message : 'Please review your details and try again.';
        }
    });

    appendChildren(summaryCard, summaryLabel, summaryValue);
    appendChildren(actions, backButton, submitButton);
    appendChildren(formGrid, nameField, emailField, phoneField);
    appendChildren(form, formGrid, contactNote, feedback, actions);
    appendChildren(wrapper, eyebrow, title, description, helper, summaryCard, form);

    return wrapper;
}

function createTextField(
    labelText: string,
    name: string,
    value: string,
    placeholder: string,
    type: string,
    autoComplete: string
): HTMLElement {
    const field = createElement('label', { className: 'ee-field' });
    const label = createElement('span', { className: 'ee-field-label', textContent: labelText });
    const input = createElement('input', {
        className: 'ee-input',
        attributes: {
            type,
            name,
            value,
            placeholder,
            autocomplete: autoComplete
        }
    });

    appendChildren(field, label, input);

    return field;
}

function toggleFormDisabled(form: HTMLFormElement, disabled: boolean) {
    Array.from(form.elements).forEach((element) => {
        if ('disabled' in element) {
            element.disabled = disabled;
        }
    });
}

function formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
}

function normalizePhoneHref(phoneNumber: string): string {
    return phoneNumber.replace(/[^\d+]/g, '');
}

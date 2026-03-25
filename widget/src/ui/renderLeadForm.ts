import { EstimateResult, LeadCaptureDetails } from '../domain/estimatorTypes';
import { appendChildren, createElement } from '../utils/dom';
import { parseOptionalString, parseRequiredEmail } from '../utils/validation';

export interface LeadFormOptions {
    estimateResult: EstimateResult;
    initialValue: Partial<LeadCaptureDetails> | null;
    isSubmitting: boolean;
    onBack: () => void;
    onSubmit: (payload: LeadCaptureDetails) => void;
}

export function renderLeadForm(options: LeadFormOptions): HTMLElement {
    const wrapper = createElement('div', { className: 'ee-panel' });
    const eyebrow = createElement('p', { className: 'ee-eyebrow', textContent: 'Save the estimate' });
    const title = createElement('h3', {
        className: 'ee-panel-title',
        textContent: `Estimated total: $${options.estimateResult.total.toFixed(2)}`
    });
    const description = createElement('p', {
        className: 'ee-panel-copy',
        textContent: 'Share your contact details and we will capture the lead with the exact server response.'
    });

    const form = createElement('form', { className: 'ee-form' });
    const nameField = createTextField('Name', 'name', options.initialValue?.name ?? '', 'Jane Doe');
    const emailField = createTextField('Email', 'email', options.initialValue?.email ?? '', 'jane@example.com');
    const phoneField = createTextField('Phone', 'phone', options.initialValue?.phone ?? '', '+1-555-0100');
    const feedback = createElement('p', { className: 'ee-form-feedback' });
    const actions = createElement('div', { className: 'ee-actions' });
    const backButton = createElement('button', {
        className: 'ee-secondary-action',
        textContent: 'Back',
        attributes: { type: 'button' }
    });
    const submitButton = createElement('button', {
        className: 'ee-primary-action',
        textContent: options.isSubmitting ? 'Saving...' : 'Submit Lead',
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
            feedback.textContent = error instanceof Error ? error.message : 'Unable to validate the lead form';
        }
    });

    appendChildren(actions, backButton, submitButton);
    appendChildren(form, nameField, emailField, phoneField, feedback, actions);
    appendChildren(wrapper, eyebrow, title, description, form);

    return wrapper;
}

function createTextField(labelText: string, name: string, value: string, placeholder: string): HTMLElement {
    const field = createElement('label', { className: 'ee-field' });
    const label = createElement('span', { className: 'ee-field-label', textContent: labelText });
    const input = createElement('input', {
        className: 'ee-input',
        attributes: {
            type: 'text',
            name,
            value,
            placeholder
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

import { EstimateInput, WidgetEstimatorConfig } from '../domain/estimatorTypes';
import { appendChildren, createElement } from '../utils/dom';
import { parsePositiveNumber } from '../utils/validation';

export interface EstimateFormOptions {
    estimatorConfig: WidgetEstimatorConfig;
    initialValue: EstimateInput | null;
    isSubmitting: boolean;
    onSubmit: (input: EstimateInput) => void;
}

export function renderEstimateForm(options: EstimateFormOptions): HTMLElement {
    const wrapper = createElement('div', { className: 'ee-panel ee-panel-form' });
    const eyebrow = createElement('p', {
        className: 'ee-eyebrow',
        textContent: `Base price: $${options.estimatorConfig.basePrice.toFixed(2)}`
    });
    const title = createElement('h3', {
        className: 'ee-panel-title',
        textContent: 'Tell us about the project'
    });
    const description = createElement('p', {
        className: 'ee-panel-copy',
        textContent: 'Choose a few details below and we will prepare an estimate right away.'
    });
    const helper = createElement('p', {
        className: 'ee-step-helper',
        textContent: 'Pricing shown here uses the latest settings for this company.'
    });

    const form = createElement('form', { className: 'ee-form' });
    const sizeField = createNumberField(
        'Project size',
        'size',
        options.initialValue?.size?.toString() ?? '1200',
        'Square feet'
    );
    const quickSizePicks = createQuickSizePicks(['600', '1200', '1800', '2400', '3200']);
    const complexityField = createChoiceFieldset('Complexity', 'complexity', options.initialValue?.complexity ?? 'medium', [
        {
            value: 'low',
            eyebrow: 'Simple',
            title: 'Low complexity',
            copy: 'Straightforward scope with minimal site constraints.'
        },
        {
            value: 'medium',
            eyebrow: 'Balanced',
            title: 'Medium complexity',
            copy: 'Typical project conditions with standard installation needs.'
        },
        {
            value: 'high',
            eyebrow: 'Custom',
            title: 'High complexity',
            copy: 'Tighter access, added coordination, or more involved work.'
        }
    ]);
    const bulkField = createChoiceFieldset('Bulk discount', 'bulk', (options.initialValue?.bulk ?? true) ? 'true' : 'false', [
        {
            value: 'true',
            eyebrow: 'Yes',
            title: 'Apply bulk pricing',
            copy: 'Use this when the project qualifies for discounted pricing.'
        },
        {
            value: 'false',
            eyebrow: 'No',
            title: 'Standard pricing',
            copy: 'Keep the estimate at the normal project rate.'
        }
    ]);
    const feedback = createElement('p', { className: 'ee-form-feedback' });
    const submitButton = createElement('button', {
        className: 'ee-primary-action',
        textContent: options.isSubmitting ? 'Calculating...' : 'Get Estimate',
        attributes: { type: 'submit' }
    });

    submitButton.disabled = options.isSubmitting;
    toggleFormDisabled(form, options.isSubmitting);

    const sizeInput = sizeField.querySelector('input[name="size"]');

    quickSizePicks.querySelectorAll('button[data-size-value]').forEach((button) => {
        button.addEventListener('click', () => {
            const sizeValue = button.getAttribute('data-size-value');

            if (sizeInput instanceof HTMLInputElement && sizeValue) {
                sizeInput.value = sizeValue;
            }
        });
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        feedback.textContent = '';

        try {
            const formData = new FormData(form);
            const input: EstimateInput = {
                size: parsePositiveNumber(String(formData.get('size') ?? ''), 'Project size'),
                complexity: parseComplexity(String(formData.get('complexity') ?? 'medium')),
                bulk: parseBulkChoice(String(formData.get('bulk') ?? 'true'))
            };

            options.onSubmit(input);
        } catch (error) {
            feedback.textContent = error instanceof Error ? error.message : 'Please review the estimate details and try again.';
        }
    });

    appendChildren(form, sizeField, quickSizePicks, complexityField, bulkField, feedback, submitButton);
    appendChildren(wrapper, eyebrow, title, description, helper, form);

    return wrapper;
}

function createNumberField(labelText: string, name: string, value: string, placeholder: string): HTMLElement {
    const field = createElement('label', { className: 'ee-field' });
    const label = createElement('span', { className: 'ee-field-label', textContent: labelText });
    const input = createElement('input', {
        className: 'ee-input ee-input--prominent',
        attributes: {
            type: 'number',
            name,
            value,
            min: '1',
            step: '1',
            placeholder,
            required: 'true'
        }
    });

    appendChildren(field, label, input);

    return field;
}

function createQuickSizePicks(values: string[]): HTMLElement {
    const row = createElement('div', { className: 'ee-quick-size-row' });

    values.forEach((value) => {
        const button = createElement('button', {
            className: 'ee-quick-size-pill',
            textContent: `${Number(value).toLocaleString()} sq ft`,
            attributes: {
                type: 'button',
                'data-size-value': value
            }
        });

        row.append(button);
    });

    return row;
}

function createChoiceFieldset(
    labelText: string,
    name: string,
    selectedValue: string,
    values: Array<{
        value: string;
        eyebrow: string;
        title: string;
        copy: string;
    }>
): HTMLElement {
    const fieldset = createElement('fieldset', { className: 'ee-fieldset' });
    const legend = createElement('legend', { className: 'ee-field-label', textContent: labelText });
    const grid = createElement('div', { className: 'ee-choice-grid' });

    values.forEach((value) => {
        const label = createElement('label', { className: 'ee-choice-card' });
        const input = createElement('input', {
            className: 'ee-choice-card__input',
            attributes: {
                type: 'radio',
                name,
                value: value.value
            }
        });
        const surface = createElement('span', { className: 'ee-choice-card__surface' });
        const eyebrow = createElement('span', { className: 'ee-choice-card__eyebrow', textContent: value.eyebrow });
        const title = createElement('strong', { className: 'ee-choice-card__title', textContent: value.title });
        const copy = createElement('span', { className: 'ee-choice-card__copy', textContent: value.copy });

        input.checked = value.value === selectedValue;

        appendChildren(surface, eyebrow, title, copy);
        appendChildren(label, input, surface);
        grid.append(label);
    });

    appendChildren(fieldset, legend, grid);

    return fieldset;
}

function toggleFormDisabled(form: HTMLFormElement, disabled: boolean) {
    Array.from(form.elements).forEach((element) => {
        if ('disabled' in element) {
            element.disabled = disabled;
        }
    });
}

function parseComplexity(value: string): EstimateInput['complexity'] {
    if (value === 'low' || value === 'medium' || value === 'high') {
        return value;
    }

    throw new Error('Complexity must be low, medium, or high');
}

function parseBulkChoice(value: string): boolean {
    if (value === 'true') {
        return true;
    }

    if (value === 'false') {
        return false;
    }

    throw new Error('Bulk discount selection is invalid');
}

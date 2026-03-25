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
    const wrapper = createElement('div', { className: 'ee-panel' });
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
        textContent: 'We will calculate the estimate on the server and return the result in real time.'
    });

    const form = createElement('form', { className: 'ee-form' });
    const sizeField = createNumberField(
        'Project size',
        'size',
        options.initialValue?.size?.toString() ?? '1200',
        'Square feet'
    );
    const complexityField = createSelectField(
        'Complexity',
        'complexity',
        options.initialValue?.complexity ?? 'medium',
        ['low', 'medium', 'high']
    );
    const bulkField = createCheckboxField(
        'Bulk project discount',
        'bulk',
        options.initialValue?.bulk ?? true
    );
    const feedback = createElement('p', { className: 'ee-form-feedback' });
    const submitButton = createElement('button', {
        className: 'ee-primary-action',
        textContent: options.isSubmitting ? 'Calculating...' : 'Get Estimate',
        attributes: { type: 'submit' }
    });

    submitButton.disabled = options.isSubmitting;
    toggleFormDisabled(form, options.isSubmitting);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        feedback.textContent = '';

        try {
            const formData = new FormData(form);
            const input: EstimateInput = {
                size: parsePositiveNumber(String(formData.get('size') ?? ''), 'Project size'),
                complexity: parseComplexity(String(formData.get('complexity') ?? 'medium')),
                bulk: formData.get('bulk') === 'on'
            };

            options.onSubmit(input);
        } catch (error) {
            feedback.textContent = error instanceof Error ? error.message : 'Unable to validate the estimate request';
        }
    });

    appendChildren(form, sizeField, complexityField, bulkField, feedback, submitButton);
    appendChildren(wrapper, eyebrow, title, description, form);

    return wrapper;
}

function createNumberField(labelText: string, name: string, value: string, placeholder: string): HTMLElement {
    const field = createElement('label', { className: 'ee-field' });
    const label = createElement('span', { className: 'ee-field-label', textContent: labelText });
    const input = createElement('input', {
        className: 'ee-input',
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

function createSelectField(
    labelText: string,
    name: string,
    selectedValue: EstimateInput['complexity'],
    values: Array<EstimateInput['complexity']>
): HTMLElement {
    const field = createElement('label', { className: 'ee-field' });
    const label = createElement('span', { className: 'ee-field-label', textContent: labelText });
    const select = createElement('select', {
        className: 'ee-input',
        attributes: {
            name
        }
    });

    values.forEach((value) => {
        const option = createElement('option', {
            textContent: value[0].toUpperCase() + value.slice(1),
            attributes: {
                value
            }
        });

        option.selected = value === selectedValue;
        select.append(option);
    });

    appendChildren(field, label, select);

    return field;
}

function createCheckboxField(labelText: string, name: string, checked: boolean): HTMLElement {
    const field = createElement('label', { className: 'ee-checkbox-field' });
    const input = createElement('input', {
        attributes: {
            type: 'checkbox',
            name
        }
    });

    input.checked = checked;

    const label = createElement('span', { className: 'ee-checkbox-label', textContent: labelText });

    appendChildren(field, input, label);

    return field;
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

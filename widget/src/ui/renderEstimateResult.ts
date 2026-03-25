import { EstimateInput, EstimateResult } from '../domain/estimatorTypes';
import { appendChildren, createElement } from '../utils/dom';

export interface EstimateResultOptions {
    input: EstimateInput;
    result: EstimateResult;
    onAdjust: () => void;
    onContinue: () => void;
}

export function renderEstimateResult(options: EstimateResultOptions): HTMLElement {
    const wrapper = createElement('div', { className: 'ee-panel' });
    const eyebrow = createElement('p', { className: 'ee-eyebrow', textContent: 'Server-calculated estimate' });
    const total = createElement('h3', {
        className: 'ee-price',
        textContent: `$${options.result.total.toFixed(2)}`
    });
    const summary = createElement('p', {
        className: 'ee-panel-copy',
        textContent: `${options.input.size.toFixed(0)} sq ft • ${capitalize(options.input.complexity)} complexity • ${
            options.input.bulk ? 'Bulk discount applied' : 'No bulk discount'
        }`
    });

    const breakdown = createElement('dl', { className: 'ee-breakdown' });
    appendChildren(
        breakdown,
        createBreakdownItem('Base price', `$${options.result.breakdown.basePrice.toFixed(2)}`),
        createBreakdownItem('Size multiplier', `${options.result.breakdown.sizeMultiplier.toFixed(2)}x`),
        createBreakdownItem('Complexity multiplier', `${options.result.breakdown.complexityMultiplier.toFixed(2)}x`),
        createBreakdownItem('Discount', `${(options.result.breakdown.discount * 100).toFixed(0)}%`)
    );

    const actions = createElement('div', { className: 'ee-actions' });
    const adjustButton = createElement('button', {
        className: 'ee-secondary-action',
        textContent: 'Adjust Inputs',
        attributes: { type: 'button' }
    });
    const continueButton = createElement('button', {
        className: 'ee-primary-action',
        textContent: 'Continue',
        attributes: { type: 'button' }
    });

    adjustButton.addEventListener('click', options.onAdjust);
    continueButton.addEventListener('click', options.onContinue);

    appendChildren(actions, adjustButton, continueButton);
    appendChildren(wrapper, eyebrow, total, summary, breakdown, actions);

    return wrapper;
}

function createBreakdownItem(labelText: string, valueText: string): HTMLElement {
    const row = createElement('div', { className: 'ee-breakdown-row' });
    const label = createElement('dt', { className: 'ee-breakdown-label', textContent: labelText });
    const value = createElement('dd', { className: 'ee-breakdown-value', textContent: valueText });

    appendChildren(row, label, value);

    return row;
}

function capitalize(value: string): string {
    return value[0].toUpperCase() + value.slice(1);
}

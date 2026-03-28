import { appendChildren, createElement } from '../utils/dom';

export interface SuccessStateOptions {
    leadId: number | null;
    businessName: string;
    onStartOver: () => void;
    onClose: () => void;
}

export function renderSuccessState(options: SuccessStateOptions): HTMLElement {
    const wrapper = createElement('div', { className: 'ee-panel ee-panel-success' });
    const eyebrow = createElement('p', { className: 'ee-eyebrow', textContent: 'Request received' });
    const icon = createElement('div', { className: 'ee-success-icon', textContent: '✓' });
    const title = createElement('h3', {
        className: 'ee-panel-title',
        textContent: 'Thanks, your estimate request has been sent.'
    });
    const description = createElement('p', {
        className: 'ee-panel-copy',
        textContent: options.leadId
            ? `Request reference #${options.leadId} was sent successfully to ${options.businessName}.`
            : `Your request was submitted successfully to ${options.businessName}.`
    });
    const helper = createElement('p', {
        className: 'ee-step-helper',
        textContent: 'You can close this window or start another estimate right away.'
    });

    const actions = createElement('div', { className: 'ee-actions' });
    const startOverButton = createElement('button', {
        className: 'ee-secondary-action',
        textContent: 'Start Another Estimate',
        attributes: { type: 'button' }
    });
    const closeButton = createElement('button', {
        className: 'ee-primary-action',
        textContent: 'Close',
        attributes: { type: 'button' }
    });

    startOverButton.addEventListener('click', options.onStartOver);
    closeButton.addEventListener('click', options.onClose);

    appendChildren(actions, startOverButton, closeButton);
    appendChildren(wrapper, eyebrow, icon, title, description, helper, actions);

    return wrapper;
}

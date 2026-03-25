import { appendChildren, createElement } from '../utils/dom';

export interface SuccessStateOptions {
    leadId: number | null;
    onStartOver: () => void;
    onClose: () => void;
}

export function renderSuccessState(options: SuccessStateOptions): HTMLElement {
    const wrapper = createElement('div', { className: 'ee-panel ee-panel-success' });
    const eyebrow = createElement('p', { className: 'ee-eyebrow', textContent: 'Lead captured' });
    const title = createElement('h3', {
        className: 'ee-panel-title',
        textContent: 'Thanks, your estimate request has been saved.'
    });
    const description = createElement('p', {
        className: 'ee-panel-copy',
        textContent: options.leadId
            ? `Lead reference #${options.leadId} was created successfully.`
            : 'Your request was submitted successfully.'
    });

    const actions = createElement('div', { className: 'ee-actions' });
    const startOverButton = createElement('button', {
        className: 'ee-secondary-action',
        textContent: 'Start Another',
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
    appendChildren(wrapper, eyebrow, title, description, actions);

    return wrapper;
}

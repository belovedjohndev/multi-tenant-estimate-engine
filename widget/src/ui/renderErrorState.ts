import { appendChildren, createElement } from '../utils/dom';

export interface ErrorStateOptions {
    message: string;
    retryLabel: string;
    onRetry: () => void;
    onClose: () => void;
}

export function renderErrorState(options: ErrorStateOptions): HTMLElement {
    const wrapper = createElement('div', { className: 'ee-panel ee-panel-error' });
    const eyebrow = createElement('p', { className: 'ee-eyebrow', textContent: 'Something went wrong' });
    const title = createElement('h3', {
        className: 'ee-panel-title',
        textContent: 'We could not complete that step.'
    });
    const description = createElement('p', {
        className: 'ee-panel-copy',
        textContent: options.message
    });

    const actions = createElement('div', { className: 'ee-actions' });
    const retryButton = createElement('button', {
        className: 'ee-primary-action',
        textContent: options.retryLabel,
        attributes: { type: 'button' }
    });
    const closeButton = createElement('button', {
        className: 'ee-secondary-action',
        textContent: 'Close',
        attributes: { type: 'button' }
    });

    retryButton.addEventListener('click', options.onRetry);
    closeButton.addEventListener('click', options.onClose);

    appendChildren(actions, retryButton, closeButton);
    appendChildren(wrapper, eyebrow, title, description, actions);

    return wrapper;
}

import { WidgetBranding } from '../domain/estimatorTypes';
import { appendChildren, createElement } from '../utils/dom';

export interface ModalOptions {
    title: string;
    branding: WidgetBranding | null;
    content: HTMLElement;
    onClose: () => void;
}

export function renderModal(options: ModalOptions): HTMLElement {
    const overlay = createElement('div', { className: 'ee-modal-overlay' });
    const dialog = createElement('section', {
        className: 'ee-modal',
        attributes: {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': options.title
        }
    });

    const header = createElement('header', { className: 'ee-modal-header' });
    const titleBlock = createElement('div', { className: 'ee-modal-heading' });
    const title = createElement('h2', { className: 'ee-modal-title', textContent: options.title });

    appendChildren(titleBlock, title);

    if (options.branding?.logoUrl) {
        const logo = createElement('img', {
            className: 'ee-brand-logo',
            attributes: {
                src: options.branding.logoUrl,
                alt: `${options.title} logo`
            }
        });

        appendChildren(titleBlock, logo);
    }

    const closeButton = createElement('button', {
        className: 'ee-modal-close',
        textContent: 'Close',
        attributes: {
            type: 'button',
            'aria-label': 'Close estimator'
        }
    });

    closeButton.addEventListener('click', options.onClose);

    const body = createElement('div', { className: 'ee-modal-body' });
    body.append(options.content);

    appendChildren(header, titleBlock, closeButton);
    appendChildren(dialog, header, body);
    overlay.append(dialog);

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            options.onClose();
        }
    });

    return overlay;
}

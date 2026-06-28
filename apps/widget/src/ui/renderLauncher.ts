import { createElement } from '../utils/dom';

export interface LauncherOptions {
    label: string;
    disabled?: boolean;
    onClick: () => void;
}

export function renderLauncher(options: LauncherOptions): HTMLButtonElement {
    const button = createElement('button', {
        className: 'ee-launcher',
        textContent: options.label,
        attributes: {
            type: 'button'
        }
    });

    button.disabled = Boolean(options.disabled);
    button.addEventListener('click', options.onClick);

    return button;
}

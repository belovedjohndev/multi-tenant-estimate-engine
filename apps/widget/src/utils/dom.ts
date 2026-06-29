export function clearElement(element: Element) {
    element.replaceChildren();
}

export function appendChildren(parent: Element, ...children: Array<Node | string | null | undefined>) {
    children.forEach((child) => {
        if (child === null || child === undefined) {
            return;
        }

        parent.append(child);
    });
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options: {
        className?: string;
        textContent?: string;
        attributes?: Record<string, string>;
    } = {}
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);

    if (options.className) {
        element.className = options.className;
    }

    if (options.textContent) {
        element.textContent = options.textContent;
    }

    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }

    return element;
}

export function ensureShadowAppRoot(container: HTMLElement): ShadowRoot {
    if (container.shadowRoot) {
        return container.shadowRoot;
    }

    return container.attachShadow({ mode: 'open' });
}

export function ensureStyles(root: ShadowRoot, styleId: string, cssText: string) {
    if (root.getElementById(styleId)) {
        return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssText;
    root.append(style);
}

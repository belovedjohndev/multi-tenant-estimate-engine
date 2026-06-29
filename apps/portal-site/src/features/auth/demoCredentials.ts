import { portalConfig } from '../../portalConfig';
import { DemoAccessField } from '../../portalState';

export function getDemoAccessValue(field: DemoAccessField): string {
    switch (field) {
        case 'clientId':
            return portalConfig.defaultClientId;
        case 'email':
            return portalConfig.demoAccess.email;
        case 'password':
            return portalConfig.demoAccess.password;
    }
}

export function isDemoAccessField(value: string | undefined): value is DemoAccessField {
    return value === 'clientId' || value === 'email' || value === 'password';
}

export async function copyTextToClipboard(value: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch {
        // Fall back to a temporary textarea when the Clipboard API is unavailable.
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.append(textArea);
    textArea.select();

    let copied = false;

    try {
        copied = document.execCommand('copy');
    } catch {
        copied = false;
    }

    textArea.remove();
    return copied;
}

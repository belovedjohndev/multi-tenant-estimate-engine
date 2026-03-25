import { WidgetApiError } from '../domain/estimatorTypes';

export function assertNonEmptyString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} must be a non-empty string`);
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        throw new Error(`${fieldName} must be a non-empty string`);
    }

    return trimmedValue;
}

export function normalizeApiBaseUrl(value: string): string {
    const normalizedValue = value.trim().replace(/\/+$/, '');

    try {
        return new URL(normalizedValue).toString().replace(/\/+$/, '');
    } catch {
        throw new Error('apiBaseUrl must be a valid absolute URL');
    }
}

export function parsePositiveNumber(value: string, fieldName: string): number {
    const parsedValue = Number.parseFloat(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        throw new Error(`${fieldName} must be a positive number`);
    }

    return parsedValue;
}

export function parseOptionalString(value: FormDataEntryValue | null): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
}

export function parseRequiredEmail(value: FormDataEntryValue | null): string {
    const email = parseOptionalString(value);

    if (!email || !EMAIL_PATTERN.test(email)) {
        throw new Error('Email must be a valid email address');
    }

    return email;
}

export function isApiError(error: unknown): error is WidgetApiError {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'statusCode' in error &&
            'code' in error &&
            'message' in error
    );
}

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (isApiError(error)) {
        return error.message;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallbackMessage;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

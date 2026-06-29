export function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

export function getStatusCode(error: unknown): number | null {
    if (error instanceof Error && 'statusCode' in error) {
        const statusCode = Number((error as { statusCode?: unknown }).statusCode);

        return Number.isFinite(statusCode) ? statusCode : null;
    }

    return null;
}

export function buildApiUnreachableMessage(apiBaseUrl: string): string {
    return `Cannot reach Estimate Engine API at ${apiBaseUrl}. Check the backend terminal, port, and CORS origins. If port 3000 is occupied, run the backend on 3001 and restart the Vite dev server after setting VITE_API_BASE_URL.`;
}

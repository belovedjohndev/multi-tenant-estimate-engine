export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, code = 'invalid_request') {
        super(400, code, message);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends AppError {
    constructor(message: string, code = 'not_found') {
        super(404, code, message);
        this.name = 'NotFoundError';
    }
}

export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

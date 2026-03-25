import { ParsedQs } from 'qs';
import { ValidationError } from '../application/errors';
import { EstimateRequest } from '../application/calculateEstimate';
import { CreateLeadRequest } from '../application/createLead';
import { EstimateResponse } from '../domain/estimate';

type UnknownRecord = Record<string, unknown>;
type QueryValue = string | string[] | ParsedQs | ParsedQs[] | undefined;

export interface ClientConfigQueryDto extends ParsedQs {
    clientId?: QueryValue;
}

export function parseClientConfigQuery(query: ClientConfigQueryDto): { clientId: string } {
    const clientId = requireQueryString(query.clientId, 'clientId query parameter is required', 'invalid_query');

    return { clientId };
}

export function parseEstimateRequest(body: unknown): EstimateRequest {
    const parsedBody = requireObject(body, 'Request body must be a JSON object');
    const clientId = requireNonEmptyString(parsedBody.clientId, 'clientId is required', 'invalid_body');
    const inputRecord = requireObject(parsedBody.input, 'input is required and must be an object');

    const input: EstimateRequest['input'] = {};

    if (inputRecord.size !== undefined) {
        if (typeof inputRecord.size !== 'number' || !Number.isFinite(inputRecord.size) || inputRecord.size <= 0) {
            throw new ValidationError('input.size must be a positive number', 'invalid_body');
        }
        input.size = inputRecord.size;
    }

    if (inputRecord.complexity !== undefined) {
        if (
            inputRecord.complexity !== 'low' &&
            inputRecord.complexity !== 'medium' &&
            inputRecord.complexity !== 'high'
        ) {
            throw new ValidationError('input.complexity must be one of low, medium, or high', 'invalid_body');
        }
        input.complexity = inputRecord.complexity;
    }

    if (inputRecord.bulk !== undefined) {
        if (typeof inputRecord.bulk !== 'boolean') {
            throw new ValidationError('input.bulk must be a boolean', 'invalid_body');
        }
        input.bulk = inputRecord.bulk;
    }

    return {
        clientId,
        input
    };
}

export function parseCreateLeadRequest(body: unknown): CreateLeadRequest {
    const parsedBody = requireObject(body, 'Request body must be a JSON object');
    const clientId = requireNonEmptyString(parsedBody.clientId, 'clientId is required', 'invalid_body');
    const email = requireNonEmptyString(parsedBody.email, 'email is required', 'invalid_body');

    if (!EMAIL_PATTERN.test(email)) {
        throw new ValidationError('email must be a valid email address', 'invalid_body');
    }

    const request: CreateLeadRequest = {
        clientId,
        email,
        estimateData: parseEstimateData(parsedBody.estimateData)
    };

    if (parsedBody.name !== undefined) {
        request.name = requireNonEmptyString(parsedBody.name, 'name must be a non-empty string', 'invalid_body');
    }

    if (parsedBody.phone !== undefined) {
        request.phone = requireNonEmptyString(parsedBody.phone, 'phone must be a non-empty string', 'invalid_body');
    }

    return request;
}

function requireObject(value: unknown, message: string): UnknownRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ValidationError(message, 'invalid_body');
    }

    return value as UnknownRecord;
}

function requireNonEmptyString(value: unknown, message: string, code: string): string {
    if (typeof value !== 'string') {
        throw new ValidationError(message, code);
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        throw new ValidationError(message, code);
    }

    return trimmedValue;
}

function requireQueryString(value: QueryValue, message: string, code: string): string {
    if (typeof value !== 'string') {
        throw new ValidationError(message, code);
    }

    return requireNonEmptyString(value, message, code);
}

function parseEstimateData(value: unknown): EstimateResponse {
    const estimateData = requireObject(value, 'estimateData is required and must be an object');
    const breakdown = requireObject(estimateData.breakdown, 'estimateData.breakdown must be an object');

    return {
        total: requireFiniteNumber(estimateData.total, 'estimateData.total must be a finite number'),
        breakdown: {
            basePrice: requireFiniteNumber(breakdown.basePrice, 'estimateData.breakdown.basePrice must be a finite number'),
            sizeMultiplier: requireFiniteNumber(
                breakdown.sizeMultiplier,
                'estimateData.breakdown.sizeMultiplier must be a finite number'
            ),
            complexityMultiplier: requireFiniteNumber(
                breakdown.complexityMultiplier,
                'estimateData.breakdown.complexityMultiplier must be a finite number'
            ),
            discount: requireFiniteNumber(breakdown.discount, 'estimateData.breakdown.discount must be a finite number')
        }
    };
}

function requireFiniteNumber(value: unknown, message: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ValidationError(message, 'invalid_body');
    }

    return value;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

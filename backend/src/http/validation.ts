import { ParsedQs } from 'qs';
import { ValidationError } from '../application/errors';
import { AuthenticatePortalUserRequest } from '../application/authenticatePortalUser';
import { EstimateRequest } from '../application/calculateEstimate';
import { CreateLeadRequest } from '../application/createLead';
import { UpdatePortalClientSettingsRequest } from '../application/updatePortalClientSettings';
import { EstimateInput, EstimateResponse, parseEstimatorConfigRecord } from '../domain/estimate';

type UnknownRecord = Record<string, unknown>;
type QueryValue = string | string[] | ParsedQs | ParsedQs[] | undefined;

export interface ClientConfigQueryDto extends ParsedQs {
    clientId?: QueryValue;
}

export interface LeadListQueryDto extends ParsedQs {
    limit?: QueryValue;
}

export function parseClientConfigQuery(query: ClientConfigQueryDto): { clientId: string } {
    const clientId = requireQueryString(query.clientId, 'clientId query parameter is required', 'invalid_query');

    return { clientId };
}

export function parseEstimateRequest(body: unknown): EstimateRequest {
    const parsedBody = requireObject(body, 'Request body must be a JSON object');
    const clientId = requireNonEmptyString(parsedBody.clientId, 'clientId is required', 'invalid_body');

    return {
        clientId,
        input: parseEstimateInput(parsedBody.input, 'input')
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
        estimateInput: parseEstimateInput(parsedBody.estimateInput, 'estimateInput'),
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

export function parsePortalLoginRequest(body: unknown): AuthenticatePortalUserRequest {
    const parsedBody = requireObject(body, 'Request body must be a JSON object');

    return {
        clientId: requireNonEmptyString(parsedBody.clientId, 'clientId is required', 'invalid_body'),
        email: requireEmail(parsedBody.email),
        password: requirePassword(parsedBody.password)
    };
}

export function parseLeadListQuery(query: LeadListQueryDto): { limit: number } {
    if (query.limit === undefined) {
        return { limit: 25 };
    }

    if (typeof query.limit !== 'string') {
        throw new ValidationError('limit query parameter must be a string', 'invalid_query');
    }

    const parsedLimit = Number.parseInt(query.limit, 10);

    if (Number.isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
        throw new ValidationError('limit query parameter must be an integer between 1 and 100', 'invalid_query');
    }

    return { limit: parsedLimit };
}

export function parsePortalClientSettingsUpdate(body: unknown): UpdatePortalClientSettingsRequest {
    const parsedBody = requireObject(body, 'Request body must be a JSON object');

    return {
        companyName: requireNonEmptyString(parsedBody.companyName, 'companyName is required', 'invalid_body'),
        logoUrl: parseOptionalUrl(parsedBody.logoUrl, 'logoUrl'),
        phone: parseOptionalStringField(parsedBody.phone, 'phone'),
        notificationEmail: parseOptionalEmail(parsedBody.notificationEmail, 'notificationEmail'),
        estimatorConfig: parseEstimatorConfigRecord(parsedBody.estimatorConfig, 'estimatorConfig')
    };
}

function parseEstimateInput(value: unknown, fieldName: string): EstimateInput {
    const inputRecord = requireObject(value, `${fieldName} is required and must be an object`);
    const input: EstimateInput = {};

    if (inputRecord.size !== undefined) {
        if (typeof inputRecord.size !== 'number' || !Number.isFinite(inputRecord.size) || inputRecord.size <= 0) {
            throw new ValidationError(`${fieldName}.size must be a positive number`, 'invalid_body');
        }
        input.size = inputRecord.size;
    }

    if (inputRecord.complexity !== undefined) {
        if (
            inputRecord.complexity !== 'low' &&
            inputRecord.complexity !== 'medium' &&
            inputRecord.complexity !== 'high'
        ) {
            throw new ValidationError(`${fieldName}.complexity must be one of low, medium, or high`, 'invalid_body');
        }
        input.complexity = inputRecord.complexity;
    }

    if (inputRecord.bulk !== undefined) {
        if (typeof inputRecord.bulk !== 'boolean') {
            throw new ValidationError(`${fieldName}.bulk must be a boolean`, 'invalid_body');
        }
        input.bulk = inputRecord.bulk;
    }

    return input;
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

function requirePassword(value: unknown): string {
    if (typeof value !== 'string') {
        throw new ValidationError('password is required', 'invalid_body');
    }

    if (value.length < 8) {
        throw new ValidationError('password must be at least 8 characters', 'invalid_body');
    }

    return value;
}

function parseOptionalStringField(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const parsedValue = requireNonEmptyString(value, `${fieldName} must be a non-empty string`, 'invalid_body');

    return parsedValue;
}

function requireQueryString(value: QueryValue, message: string, code: string): string {
    if (typeof value !== 'string') {
        throw new ValidationError(message, code);
    }

    return requireNonEmptyString(value, message, code);
}

function parseOptionalEmail(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const email = requireNonEmptyString(value, `${fieldName} must be a non-empty string`, 'invalid_body').toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
        throw new ValidationError(`${fieldName} must be a valid email address`, 'invalid_body');
    }

    return email;
}

function parseOptionalUrl(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const urlValue = requireNonEmptyString(value, `${fieldName} must be a non-empty string`, 'invalid_body');

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(urlValue);
    } catch {
        throw new ValidationError(`${fieldName} must be a valid URL`, 'invalid_body');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new ValidationError(`${fieldName} must use http or https`, 'invalid_body');
    }

    return parsedUrl.toString();
}

function requireEmail(value: unknown): string {
    const email = requireNonEmptyString(value, 'email is required', 'invalid_body').toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
        throw new ValidationError('email must be a valid email address', 'invalid_body');
    }

    return email;
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

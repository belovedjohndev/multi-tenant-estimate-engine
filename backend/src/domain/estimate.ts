export interface EstimateInput {
    size?: number;
    complexity?: 'low' | 'medium' | 'high';
    bulk?: boolean;
}

export interface EstimatorConfig {
    basePrice: number;
    multipliers: {
        size: number;
        complexity: number;
    };
    discounts: {
        bulk: number;
    };
}

export interface EstimateConfigVersionReference {
    id: number;
    versionNumber: number;
}

export interface EstimateResponse {
    total: number;
    breakdown: {
        basePrice: number;
        sizeMultiplier: number;
        complexityMultiplier: number;
        discount: number;
    };
    configVersion: EstimateConfigVersionReference;
}

export function parseEstimatorConfigRecord(value: unknown, errorPrefix = 'estimatorConfig'): EstimatorConfig {
    const config = requireObject(value, `${errorPrefix} must be an object`);
    const multipliers = requireObject(config.multipliers, `${errorPrefix}.multipliers must be an object`);
    const discounts = requireObject(config.discounts, `${errorPrefix}.discounts must be an object`);

    return {
        basePrice: requireNumber(config.basePrice, `${errorPrefix}.basePrice must be a number`),
        multipliers: {
            size: requireNumber(multipliers.size, `${errorPrefix}.multipliers.size must be a number`),
            complexity: requireNumber(multipliers.complexity, `${errorPrefix}.multipliers.complexity must be a number`)
        },
        discounts: {
            bulk: requireNumber(discounts.bulk, `${errorPrefix}.discounts.bulk must be a number`)
        }
    };
}

export function calculateEstimateFromConfig(
    estimatorConfig: EstimatorConfig,
    input: EstimateInput
): Omit<EstimateResponse, 'configVersion'> {
    let total = estimatorConfig.basePrice;
    let sizeMultiplier = 1;
    let complexityMultiplier = 1;
    let discount = 0;

    if (typeof input.size === 'number') {
        sizeMultiplier = estimatorConfig.multipliers.size;
        total *= sizeMultiplier;
    }

    if (input.complexity === 'high') {
        complexityMultiplier = estimatorConfig.multipliers.complexity;
        total *= complexityMultiplier;
    }

    if (input.bulk) {
        discount = estimatorConfig.discounts.bulk;
        total *= 1 - discount;
    }

    return {
        total: Math.round(total * 100) / 100,
        breakdown: {
            basePrice: estimatorConfig.basePrice,
            sizeMultiplier,
            complexityMultiplier,
            discount
        }
    };
}

function requireObject(value: unknown, message: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(message);
    }

    return value as Record<string, unknown>;
}

function requireNumber(value: unknown, message: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(message);
    }

    return value;
}

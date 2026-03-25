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

export interface EstimateResponse {
    total: number;
    breakdown: {
        basePrice: number;
        sizeMultiplier: number;
        complexityMultiplier: number;
        discount: number;
    };
}

export function calculateEstimateFromConfig(
    estimatorConfig: EstimatorConfig,
    input: EstimateInput
): EstimateResponse {
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

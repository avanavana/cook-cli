import { CookError } from './cook-error.js';

export const DEFAULT_MAX_DISHES = 500;
export const DEFAULT_MAX_RENDERED_PATHS = 50000;

export interface ExecutionLimits {
  maxDishes: number;
  maxRenderedPaths: number;
}

export function resolveExecutionLimits(config: {
  maxDishes?: number;
  maxRenderedPaths?: number;
}): ExecutionLimits {
  return {
    maxDishes: config.maxDishes ?? DEFAULT_MAX_DISHES,
    maxRenderedPaths: config.maxRenderedPaths ?? DEFAULT_MAX_RENDERED_PATHS
  };
}

export function assertDishCountWithinLimit(
  dishCount: number,
  limits: ExecutionLimits
): void {
  if (dishCount > limits.maxDishes) {
    throw new CookError(
      'EXPANSION_LIMIT_EXCEEDED',
      `Recipe expansion would create ${dishCount} dishes, which exceeds the configured limit of ${limits.maxDishes}.`
    );
  }
}

export function assertRenderedPathCountWithinLimit(
  renderedPathCount: number,
  limits: ExecutionLimits
): void {
  if (renderedPathCount > limits.maxRenderedPaths) {
    throw new CookError(
      'EXPANSION_LIMIT_EXCEEDED',
      `Recipe expansion would render ${renderedPathCount} paths, which exceeds the configured limit of ${limits.maxRenderedPaths}.`
    );
  }
}

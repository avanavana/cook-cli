import { resolve } from 'node:path';

import { loadCookConfig } from '../config/config.js';
import { applyPlan } from '../core/apply-plan.js';
import { CookError } from '../core/cook-error.js';
import { assertDishCountWithinLimit, assertRenderedPathCountWithinLimit, resolveExecutionLimits } from '../core/execution-limits.js';
import { parseRecipe } from '../core/parse-recipe.js';
import { planExecution, type ConflictStrategy } from '../core/plan-execution.js';
import { renderRecipe } from '../core/render-recipe.js';
import { resolveRecipeSource } from '../core/recipe-source.js';
import { flattenRenderedNodes } from '../core/recipe-tree.js';
import { readProcessStdin } from '../core/stdin.js';
import { loadExpandedBindingSets } from '../core/resolve-variables.js';
import type { ExecutionPlan } from '../core/recipe-types.js';
import { formatExecutionPlan } from '../utils/format-tree.js';

export interface CommonRecipeOptions {
  out?: string;
  variable?: string[];
  var?: string[];
  force?: boolean;
  noClobber?: boolean;
  merge?: boolean;
}

export async function executeRecipeCommand(
  recipeArgument: string,
  positionalArguments: string[],
  options: CommonRecipeOptions & { dryRun: boolean }
): Promise<string> {
  const recipeSource = await resolveRecipeSource(recipeArgument);
  const recipe = parseRecipe(recipeSource.source);
  const explicitBindingSets = await loadExpandedBindingSets(
    [ ...(options.variable ?? []), ...(options.var ?? []) ],
    async () => readProcessStdin()
  );
  const limits = resolveExecutionLimits(await loadCookConfig());

  assertDishCountWithinLimit(explicitBindingSets.length, limits);

  const conflictStrategy = resolveConflictStrategy(options);
  const outDirectory = resolve(options.out ?? process.cwd());
  const plans: ExecutionPlan[] = [];
  let renderedPathCount = 0;

  for (const explicitBindings of explicitBindingSets) {
    const renderedRecipe = renderRecipe(recipe, {
      explicitBindings,
      positionalArguments
    });
    renderedPathCount += flattenRenderedNodes(renderedRecipe.roots).length;
    assertRenderedPathCountWithinLimit(renderedPathCount, limits);
    const plan = await planExecution(renderedRecipe, {
      outDirectory,
      conflictStrategy
    });

    plans.push(plan);
  }

  validateBatchPlanOutputs(plans);
  const preview = formatExecutionPlans(plans);

  if (!options.dryRun) {
    for (const plan of plans) {
      if (plan.conflicts.length > 0) {
        throw new CookError(
          'PLAN_CONFLICTS',
          'Execution plan contains conflicts. Re-run with --force, --no-clobber, or --merge as appropriate.'
        );
      }
    }

    for (const plan of plans) {
      await applyPlan(plan);
    }
  }

  return preview;
}

function resolveConflictStrategy(options: CommonRecipeOptions): ConflictStrategy {
  const enabledStrategies = [
    options.force ? 'force' : undefined,
    options.noClobber ? 'no-clobber' : undefined,
    options.merge ? 'merge' : undefined
  ].filter(Boolean);

  if (enabledStrategies.length > 1) {
    throw new Error('Use only one of --force, --no-clobber, or --merge.');
  }

  if (options.force) {
    return 'overwrite';
  }

  if (options.noClobber || options.merge) {
    return 'skip';
  }

  return 'error';
}

function formatExecutionPlans(plans: ExecutionPlan[]): string {
  if (plans.length === 1) {
    return formatExecutionPlan(plans[0]!);
  }

  const lines: string[] = [ `Dishes (${plans.length})` ];

  plans.forEach((plan, index) => {
    lines.push('');
    lines.push(`Dish ${index + 1}`);
    lines.push(formatExecutionPlan(plan));
  });

  return lines.join('\n');
}

function validateBatchPlanOutputs(plans: ExecutionPlan[]): void {
  const pathTypes = new Map<string, 'file' | 'directory'>();

  plans.forEach((plan, planIndex) => {
    for (const directory of plan.directories) {
      const existingType = pathTypes.get(directory.relativePath);

      if (existingType === 'file') {
        throw new CookError(
          'DUPLICATE_PATH',
          `Expanded dish ${planIndex + 1} renders "${directory.relativePath}" as a directory, but another dish renders it as a file.`
        );
      }

      pathTypes.set(directory.relativePath, 'directory');
    }

    for (const file of plan.files) {
      const existingType = pathTypes.get(file.relativePath);

      if (existingType) {
        throw new CookError(
          'DUPLICATE_PATH',
          `Expanded dishes render the path "${file.relativePath}" more than once.`
        );
      }

      pathTypes.set(file.relativePath, 'file');
    }
  });
}

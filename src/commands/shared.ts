import { resolve } from 'node:path';

import { applyPlan } from '../core/apply-plan.js';
import { parseRecipe } from '../core/parse-recipe.js';
import { planExecution, type ConflictStrategy } from '../core/plan-execution.js';
import { renderRecipe } from '../core/render-recipe.js';
import { resolveRecipeSource } from '../core/recipe-source.js';
import { readProcessStdin } from '../core/stdin.js';
import { loadExplicitBindings } from '../core/resolve-variables.js';
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
  const explicitBindings = await loadExplicitBindings(
    [ ...(options.variable ?? []), ...(options.var ?? []) ],
    async () => readProcessStdin()
  );
  const renderedRecipe = renderRecipe(recipe, {
    explicitBindings,
    positionalArguments
  });
  const conflictStrategy = resolveConflictStrategy(options);
  const plan = await planExecution(renderedRecipe, {
    outDirectory: resolve(options.out ?? process.cwd()),
    conflictStrategy
  });
  const preview = formatExecutionPlan(plan);

  if (!options.dryRun) {
    await applyPlan(plan);
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

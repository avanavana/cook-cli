import { resolve } from 'node:path';

import { saveRecipe } from '../config/recipe-store.js';
import { applyPlan } from '../core/apply-plan.js';
import { parseRecipe } from '../core/parse-recipe.js';
import { planExecution } from '../core/plan-execution.js';
import type { ExecutionPlan, RecipeNodeTemplate, RecipeTemplate } from '../core/recipe-types.js';
import { renderRecipe } from '../core/render-recipe.js';
import { collectRecipeVariableNames } from '../core/resolve-variables.js';
import { formatExecutionPlan } from '../utils/format-tree.js';

export interface RawRecipeInspection {
  recipe?: RecipeTemplate;
  error?: string;
  templateTree?: string;
  variableNames: string[];
}

export interface RawReviewResult {
  plan: ExecutionPlan;
  previewText: string;
  variableNames: string[];
}

export function inspectRawRecipe(source: string): RawRecipeInspection {
  if (source.trim() === '') {
    return {
      error: 'Start typing or paste a recipe to preview it.',
      variableNames: []
    };
  }

  try {
    const recipe = parseRecipe(source);

    return {
      recipe,
      templateTree: renderTemplateTree(recipe.outline),
      variableNames: collectRecipeVariableNames(recipe)
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not parse the recipe.',
      variableNames: []
    };
  }
}

export function getNextVariableName(
  variableNames: string[],
  bindings: Record<string, string>
): string | undefined {
  return variableNames.find((variableName) => bindings[variableName] === undefined);
}

export async function buildRawReview(
  recipeSource: string,
  bindings: Record<string, string>,
  outDirectory: string
): Promise<RawReviewResult> {
  const recipe = parseRecipe(recipeSource);
  const variableNames = collectRecipeVariableNames(recipe);
  const renderedRecipe = renderRecipe(recipe, {
    explicitBindings: bindings
  });
  const plan = await planExecution(renderedRecipe, {
    outDirectory: resolve(outDirectory),
    conflictStrategy: 'error'
  });

  return {
    plan,
    previewText: formatExecutionPlan(plan),
    variableNames
  };
}

export async function applyRawRecipe(
  recipeSource: string,
  bindings: Record<string, string>,
  outDirectory: string
): Promise<ExecutionPlan> {
  const { plan } = await buildRawReview(recipeSource, bindings, outDirectory);

  await applyPlan(plan);

  return plan;
}

export async function saveRawRecipe(
  name: string,
  recipeSource: string
): Promise<string> {
  return saveRecipe(name, recipeSource);
}

function renderTemplateTree(nodes: RecipeNodeTemplate[]): string {
  const lines: string[] = [];

  function visit(node: RecipeNodeTemplate, indentLevel: number): void {
    const suffix = inferTemplateNodeType(node) === 'directory' ? '/' : '';

    lines.push(`${'  '.repeat(indentLevel)}${node.name}${suffix}`);

    for (const child of node.children) {
      visit(child, indentLevel + 1);
    }
  }

  for (const node of nodes) {
    visit(node, 0);
  }

  return lines.join('\n');
}

function inferTemplateNodeType(node: RecipeNodeTemplate): 'file' | 'directory' {
  if (node.children.length > 0) {
    return 'directory';
  }

  if (node.forcedFile) {
    return 'file';
  }

  if (node.name.startsWith('.')) {
    return 'file';
  }

  if (node.name.includes('.')) {
    return 'file';
  }

  return 'directory';
}

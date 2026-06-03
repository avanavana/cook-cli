import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { pathExists } from '../config/app-paths.js';
import { getSavedRecipePath, savedRecipeExists } from '../config/recipe-store.js';
import { CookError } from './cook-error.js';
import { inspectInlineExpressionSyntax, normalizeInlineExpressionToRecipe } from './inline-recipe.js';
import { hasPipedStdin, readProcessStdin } from './stdin.js';

export interface ResolvedRecipeSource {
  kind: 'saved' | 'path' | 'stdin' | 'inline';
  source: string;
  displayName: string;
}

export async function resolveRecipeSource(recipeArgument: string): Promise<ResolvedRecipeSource> {
  if (recipeArgument === '-') {
    if (!hasPipedStdin()) {
      throw new CookError('STDIN_UNAVAILABLE', 'Recipe "-" requires stdin input.');
    }

    return {
      kind: 'stdin',
      source: await readProcessStdin(),
      displayName: 'stdin'
    };
  }

  const expandedPath = expandHomePath(recipeArgument);
  const savedRecipeFound = await savedRecipeExists(recipeArgument);
  const filesystemPathExists = await pathExists(expandedPath);
  const inlineSyntax = inspectInlineExpressionSyntax(recipeArgument);
  const looksLikeExplicitPath = path.isAbsolute(expandedPath)
    || recipeArgument.startsWith('.')
    || recipeArgument.startsWith('~')
    || recipeArgument.endsWith('.rcp');
  const shouldTreatAsInline = /\s/.test(recipeArgument)
    && !savedRecipeFound
    && !filesystemPathExists
    && (inlineSyntax.hasControlToken || (!looksLikeExplicitPath && !inlineSyntax.hasEmbeddedPathSeparator));

  if (shouldTreatAsInline) {
    return {
      kind: 'inline',
      source: normalizeInlineExpressionToRecipe(recipeArgument),
      displayName: 'inline expression'
    };
  }

  if (looksLikeExplicitPath || filesystemPathExists || inlineSyntax.hasEmbeddedPathSeparator) {
    return {
      kind: 'path',
      source: await readFile(expandedPath, 'utf8'),
      displayName: expandedPath
    };
  }

  if (savedRecipeFound) {
    const savedPath = getSavedRecipePath(recipeArgument);

    return {
      kind: 'saved',
      source: await readFile(savedPath, 'utf8'),
      displayName: savedPath
    };
  }

  const fallbackSavedPath = getSavedRecipePath(recipeArgument);

  throw new CookError('RECIPE_NOT_FOUND', `Saved recipe "${recipeArgument}" was not found at ${fallbackSavedPath}.`);
}

export function expandHomePath(value: string): string {
  if (!value.startsWith('~/')) {
    return value;
  }

  return path.join(process.env.HOME ?? process.cwd(), value.slice(2));
}

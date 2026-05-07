import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { pathExists } from '../config/app-paths.js';
import { getSavedRecipePath, savedRecipeExists } from '../config/recipe-store.js';
import { CookError } from './cook-error.js';
import { normalizeInlineExpressionToRecipe } from './inline-recipe.js';
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
  const looksLikePath = recipeArgument.includes('/')
    || recipeArgument.startsWith('.')
    || recipeArgument.startsWith('~')
    || recipeArgument.endsWith('.rcp');

  if (/\s/.test(recipeArgument) && !savedRecipeFound && !filesystemPathExists && !looksLikePath) {
    return {
      kind: 'inline',
      source: normalizeInlineExpressionToRecipe(recipeArgument),
      displayName: 'inline expression'
    };
  }

  if (looksLikePath || filesystemPathExists) {
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

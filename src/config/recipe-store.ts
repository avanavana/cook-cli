import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { CookError } from '../core/cook-error.js';
import { ensureCookRecipesDirectory, getCookRecipesDirectory, pathExists } from './app-paths.js';

export const RESERVED_RECIPE_NAMES = [
  'add',
  'clone',
  'edit',
  'help',
  'list',
  'raw',
  'show',
  'taste',
  'validate',
  'version'
] as const;

export function getSavedRecipePath(name: string): string {
  return path.join(getCookRecipesDirectory(), `${name}.rcp`);
}

export async function saveRecipe(name: string, source: string): Promise<string> {
  ensureRecipeNameAllowed(name);
  await ensureCookRecipesDirectory();

  const targetPath = getSavedRecipePath(name);

  await writeFile(targetPath, source, 'utf8');

  return targetPath;
}

export async function readSavedRecipe(name: string): Promise<string> {
  ensureRecipeNameAllowed(name);

  return readFile(getSavedRecipePath(name), 'utf8');
}

export async function savedRecipeExists(name: string): Promise<boolean> {
  if (!isRecipeNameShapeValid(name)) {
    return false;
  }

  return pathExists(getSavedRecipePath(name));
}

export async function listSavedRecipes(): Promise<string[]> {
  const recipesDirectory = await ensureCookRecipesDirectory();
  const entries = await readdir(recipesDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.rcp'))
    .map((entry) => entry.name.replace(/\.rcp$/, ''))
    .sort((left, right) => left.localeCompare(right));
}

export function ensureRecipeNameAllowed(name: string): void {
  if (!isRecipeNameShapeValid(name)) {
    throw new CookError(
      'INVALID_RECIPE_NAME',
      `Recipe name "${name}" is invalid. Use a simple saved-recipe name without slashes or spaces.`
    );
  }

  if (RESERVED_RECIPE_NAMES.includes(name as (typeof RESERVED_RECIPE_NAMES)[number])) {
    throw new CookError(
      'RESERVED_RECIPE_NAME',
      `Recipe name "${name}" is reserved for a built-in subcommand.`
    );
  }
}

function isRecipeNameShapeValid(name: string): boolean {
  return name.trim() !== '' && !/\s/.test(name) && !name.includes('/') && !name.includes('\\') && !name.endsWith('.rcp');
}

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getSavedRecipePath, renameSavedRecipe } from '../src/config/recipe-store.js';

describe('renameSavedRecipe', () => {
  it('renames a saved recipe file', async () => {
    const tempHomeDirectory = mkdtempSync(path.join(os.tmpdir(), 'cook-home-'));
    const recipesDirectory = path.join(tempHomeDirectory, '.cook', 'recipes');
    const previousHome = process.env.HOME;

    mkdirSync(recipesDirectory, { recursive: true });
    writeFileSync(path.join(recipesDirectory, 'example.rcp'), 'project\n', 'utf8');
    process.env.HOME = tempHomeDirectory;

    try {
      const renamedPath = await renameSavedRecipe('example', 'helloworld');

      expect(renamedPath).toBe(getSavedRecipePath('helloworld'));
      expect(readFileSync(path.join(recipesDirectory, 'helloworld.rcp'), 'utf8')).toBe('project\n');
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });
});

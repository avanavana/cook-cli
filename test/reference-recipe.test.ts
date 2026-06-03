import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseRecipe } from '../src/core/parse-recipe.js';

describe('bundled example recipe', () => {
  it('stays in sync with the parser', () => {
    const exampleRecipePath = new URL('../assets/default-recipes/example.rcp', import.meta.url);
    const exampleRecipeSource = readFileSync(exampleRecipePath, 'utf8');
    const recipe = parseRecipe(exampleRecipeSource);

    expect(recipe.outline[0]?.name).toBe('{{project}}');
    expect(recipe.contentBlocks.map((block) => block.header)).toContain('{{project}}/docs/README.md');
  });
});

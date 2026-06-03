import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseRecipe } from '../src/core/parse-recipe.js';

describe('bundled reference recipe', () => {
  it('stays in sync with the parser', () => {
    const referenceRecipePath = new URL('../assets/default-recipes/reference.rcp', import.meta.url);
    const referenceRecipeSource = readFileSync(referenceRecipePath, 'utf8');
    const recipe = parseRecipe(referenceRecipeSource);

    expect(recipe.outline[0]?.name).toBe('{{project}}');
    expect(recipe.contentBlocks.map((block) => block.header)).toContain('{{project}}/docs/README.md');
  });
});

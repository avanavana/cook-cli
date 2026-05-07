import { describe, expect, it } from 'vitest';

import { CookError } from '../src/core/cook-error.js';
import { parseRecipe } from '../src/core/parse-recipe.js';
import { renderRecipe } from '../src/core/render-recipe.js';

describe('renderRecipe', () => {
  it('replaces a single variable', () => {
    const recipe = parseRecipe(`{{project}}\n  README.md\n\nREADME.md\n---\n# {{project}}`);
    const rendered = renderRecipe(recipe, {
      explicitBindings: { project: 'my-app' }
    });

    expect(rendered.roots[0]?.name).toBe('my-app');
    expect(rendered.files[0]?.content).toBe('# my-app');
  });

  it('mixes explicit and positional binding', () => {
    const recipe = parseRecipe(`{{project}}\n  apps\n    {{app-name}}`);
    const rendered = renderRecipe(recipe, {
      explicitBindings: { project: 'platform' },
      positionalArguments: [ 'dashboard' ]
    });

    expect(rendered.bindings).toEqual({
      project: 'platform',
      'app-name': 'dashboard'
    });
  });

  it('expands numeric ranges', () => {
    const recipe = parseRecipe(`parent\n  child-{{0..2}}`);
    const rendered = renderRecipe(recipe);
    const childNames = rendered.roots[0]?.children.map((child) => child.name);

    expect(childNames).toEqual([ 'child-0', 'child-1', 'child-2' ]);
  });

  it('expands explicit lists', () => {
    const recipe = parseRecipe(`services\n  {{api,web,docs}}`);
    const rendered = renderRecipe(recipe);
    const childNames = rendered.roots[0]?.children.map((child) => child.name);

    expect(childNames).toEqual([ 'api', 'web', 'docs' ]);
  });

  it('creates cartesian products for multiple expansions on one line', () => {
    const recipe = parseRecipe(`parent\n  item-{{a,b}}-{{1..2}}`);
    const rendered = renderRecipe(recipe);
    const childNames = rendered.roots[0]?.children.map((child) => child.name);

    expect(childNames).toEqual([ 'item-a-1', 'item-a-2', 'item-b-1', 'item-b-2' ]);
  });

  it('rejects duplicate rendered paths', () => {
    const recipe = parseRecipe(`parent\n  {{api,api}}`);

    expect(() => renderRecipe(recipe)).toThrowError(CookError);
  });

  it('fails when variables are unresolved', () => {
    const recipe = parseRecipe(`{{project}}\n  README.md`);

    expect(() => renderRecipe(recipe)).toThrowError(CookError);
  });
});

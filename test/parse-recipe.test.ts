import { describe, expect, it } from 'vitest';

import { CookError } from '../src/core/cook-error.js';
import { parseRecipe } from '../src/core/parse-recipe.js';

describe('parseRecipe', () => {
  it('parses a simple nested tree', () => {
    const recipe = parseRecipe(`project\n  src\n    app\n  README.md`);

    expect(recipe.outline).toHaveLength(1);
    expect(recipe.outline[0]?.name).toBe('project');
    expect(recipe.outline[0]?.children[0]?.name).toBe('src');
    expect(recipe.outline[0]?.children[0]?.children[0]?.name).toBe('app');
    expect(recipe.outline[0]?.children[1]?.name).toBe('README.md');
  });

  it('supports multiple top-level nodes', () => {
    const recipe = parseRecipe(`docs\nsrc\nREADME.md`);

    expect(recipe.outline.map((node) => node.name)).toEqual([ 'docs', 'src', 'README.md' ]);
  });

  it('parses file content blocks', () => {
    const recipe = parseRecipe(`project\n  README.md\n\nREADME.md\n---\n# Hello`);

    expect(recipe.contentBlocks).toHaveLength(1);
    expect(recipe.contentBlocks[0]?.header).toBe('README.md');
    expect(recipe.contentBlocks[0]?.body).toBe('# Hello');
  });

  it('marks an extensionless file when a content block targets it', () => {
    const recipe = parseRecipe(`project\n  Dockerfile\n\nDockerfile\n---\nFROM node:22`);
    const dockerfile = recipe.outline[0]?.children[0];

    expect(dockerfile?.forcedFile).toBe(true);
  });

  it('rejects invalid indentation', () => {
    expect(() => parseRecipe(`project\n   src\n  app`)).toThrowError(CookError);
  });

  it('rejects malformed content blocks without a separator', () => {
    expect(() => parseRecipe(`project\n  README.md\n\nREADME.md\n# Hello`)).toThrowError(CookError);
  });

  it('rejects content blocks that reference missing files', () => {
    expect(() => parseRecipe(`project\n  src\n\nREADME.md\n---\n# Hello`)).toThrowError(CookError);
  });
});

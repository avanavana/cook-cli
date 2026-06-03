import { describe, expect, it } from 'vitest';

import { resolveRecipeSource } from '../src/core/recipe-source.js';

describe('resolveRecipeSource', () => {
  it('treats slash control tokens as inline recipe syntax', async () => {
    const resolved = await resolveRecipeSource('WI{{19..20}} / archive final raw selected wip');

    expect(resolved.kind).toBe('inline');
    expect(resolved.source).toBe(
      [
        'WI{{19..20}}',
        '  archive',
        '  final',
        '  raw',
        '  selected',
        '  wip'
      ].join('\n')
    );
  });

  it('keeps embedded path separators path-like', async () => {
    await expect(resolveRecipeSource('missing folder/recipe')).rejects.toThrow(/ENOENT|Saved recipe/);
  });
});

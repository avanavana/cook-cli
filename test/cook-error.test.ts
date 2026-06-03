import { describe, expect, it } from 'vitest';

import { CookError, formatCookError } from '../src/core/cook-error.js';

describe('formatCookError', () => {
  it('expands expansion-limit errors into a guided message', () => {
    const message = formatCookError(
      new CookError(
        'EXPANSION_LIMIT_EXCEEDED',
        'Recipe expansion would create 900 dishes, which exceeds the configured limit of 500.'
      )
    );

    expect(message).toContain('Expansion limit exceeded.');
    expect(message).toContain('Recipe expansion would create 900 dishes');
    expect(message).toContain('.cook/config.toml');
    expect(message).toContain('Warning: increasing these limits can create very large batches');
    expect(message).toContain('max_dishes = 500');
    expect(message).toContain('max_rendered_paths = 50000');
  });

  it('leaves other cook errors unchanged', () => {
    const message = formatCookError(new CookError('INVALID_INLINE_RECIPE', 'Inline expression cannot be empty.'));

    expect(message).toBe('Inline expression cannot be empty.');
  });
});

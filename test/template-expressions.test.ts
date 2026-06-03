import { describe, expect, it } from 'vitest';

import { parsePlaceholderToken } from '../src/core/template-expressions.js';

describe('parsePlaceholderToken', () => {
  it('preserves zero padding in numeric ranges', () => {
    const token = parsePlaceholderToken('00..03');

    expect(token).toEqual({
      type: 'expansion',
      values: [ '00', '01', '02', '03' ]
    });
  });
});

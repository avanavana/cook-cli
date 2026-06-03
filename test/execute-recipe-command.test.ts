import { describe, expect, it } from 'vitest';

import { executeRecipeCommand } from '../src/commands/shared.js';

describe('executeRecipeCommand', () => {
  it('renders multiple dishes from an expanded variable value', async () => {
    const output = await executeRecipeCommand('{{name}} README.md', [], {
      dryRun: true,
      out: process.cwd(),
      var: [ 'name=WI{{00..02}}' ]
    });

    expect(output).toContain('Dishes (3)');
    expect(output).toContain('name="WI00"');
    expect(output).toContain('name="WI01"');
    expect(output).toContain('name="WI02"');
    expect(output).toContain('[create] WI00/README.md');
    expect(output).toContain('[create] WI02/README.md');
  });
});

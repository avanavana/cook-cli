import { describe, expect, it } from 'vitest';

import { createProgram } from '../src/cli/program.js';
import { createTasteCommand } from '../src/commands/taste.js';
import { ensureRecipeNameAllowed } from '../src/config/recipe-store.js';

describe('CLI help', () => {
  it('includes top-level examples', () => {
    const help = createProgram().helpInformation();

    expect(help).toContain('cook taste');
    expect(help).toContain(`cook 'project / src README.md' -o ~/Desktop`);
    expect(help).toContain('cook clone ./existing-project imported-project');
  });

  it('includes taste examples', () => {
    const help = createTasteCommand().helpInformation();

    expect(help).toContain('cook taste web-app my-app -o ~/Code');
    expect(help).toContain('cook taste ./recipes/app.rcp --variable project=my-app');
  });
});

describe('recipe names', () => {
  it('rejects reserved subcommand names', () => {
    expect(() => ensureRecipeNameAllowed('add')).toThrowError();
    expect(() => ensureRecipeNameAllowed('taste')).toThrowError();
  });
});

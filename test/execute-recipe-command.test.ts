import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

  it('enforces the configured dish limit', async () => {
    const tempHomeDirectory = mkdtempSync(path.join(os.tmpdir(), 'cook-home-'));
    const configDirectory = path.join(tempHomeDirectory, '.cook');
    const configPath = path.join(configDirectory, 'config.toml');
    const previousHome = process.env.HOME;

    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(configPath, 'max_dishes = 2\n', 'utf8');
    process.env.HOME = tempHomeDirectory;

    try {
      await expect(executeRecipeCommand('{{name}} README.md', [], {
        dryRun: true,
        out: process.cwd(),
        var: [ 'name=WI{{00..02}}' ]
      })).rejects.toThrow(/exceeds the configured limit of 2/);
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });
});

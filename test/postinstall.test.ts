import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('postinstall bootstrap', () => {
  it('creates the cook home, recipes directory, and default config file', () => {
    const tempHomeDirectory = mkdtempSync(path.join(os.tmpdir(), 'cook-home-'));

    runPostinstall(tempHomeDirectory);

    expect(existsSync(path.join(tempHomeDirectory, '.cook'))).toBe(true);
    expect(existsSync(path.join(tempHomeDirectory, '.cook', 'recipes'))).toBe(true);

    const configPath = path.join(tempHomeDirectory, '.cook', 'config.toml');

    expect(existsSync(configPath)).toBe(true);
    expect(readFileSync(configPath, 'utf8')).toContain('# Cook configuration');
    expect(readFileSync(path.join(tempHomeDirectory, '.cook', 'recipes', 'reference.rcp'), 'utf8'))
      .toContain('# Cook recipe reference');
  });

  it('does not overwrite an existing config file', () => {
    const tempHomeDirectory = mkdtempSync(path.join(os.tmpdir(), 'cook-home-'));
    const configDirectory = path.join(tempHomeDirectory, '.cook');
    const configPath = path.join(configDirectory, 'config.toml');

    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(configPath, 'editor = "zed --wait"\n', { encoding: 'utf8', flag: 'w' });

    runPostinstall(tempHomeDirectory);

    expect(readFileSync(configPath, 'utf8')).toBe('editor = "zed --wait"\n');
  });

  it('does not overwrite an existing bundled recipe file', () => {
    const tempHomeDirectory = mkdtempSync(path.join(os.tmpdir(), 'cook-home-'));
    const recipesDirectory = path.join(tempHomeDirectory, '.cook', 'recipes');
    const recipePath = path.join(recipesDirectory, 'reference.rcp');

    mkdirSync(recipesDirectory, { recursive: true });
    writeFileSync(recipePath, 'custom reference\n', { encoding: 'utf8', flag: 'w' });

    runPostinstall(tempHomeDirectory);

    expect(readFileSync(recipePath, 'utf8')).toBe('custom reference\n');
  });
});

function runPostinstall(homeDirectory: string): void {
  execFileSync(process.execPath, [ path.join(process.cwd(), 'scripts/postinstall.js') ], {
    cwd: process.cwd(),
    env: { ...process.env, HOME: homeDirectory }
  });
}

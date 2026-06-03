import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type PackageJson = {
  bin?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
};

describe('package metadata', () => {
  it('builds the CLI before packing installable artifacts and bootstraps install-time setup', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts?.prepack).toBe('npm run build');
    expect(packageJson.scripts?.postinstall).toBe('node scripts/postinstall.js');
    expect(packageJson.files).toContain('dist');
    expect(packageJson.files).toContain('assets/default-recipes');
    expect(packageJson.files).toContain('scripts/postinstall.js');
    expect(packageJson.bin?.cook).toBe('dist/index.js');
  });
});

function readPackageJson(): PackageJson {
  const packageJsonPath = new URL('../package.json', import.meta.url);
  const packageJson = readFileSync(packageJsonPath, 'utf8');

  return JSON.parse(packageJson) as PackageJson;
}

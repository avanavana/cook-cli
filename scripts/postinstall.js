#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CONFIG_SOURCE = `# Cook configuration
# Set editor to override the editor used by \`cook edit\`.
# editor = "code --wait"
`;

function getCookHomeDirectory() {
  return path.join(os.homedir(), '.cook');
}

function getCookRecipesDirectory() {
  return path.join(getCookHomeDirectory(), 'recipes');
}

function getCookConfigPath() {
  return path.join(getCookHomeDirectory(), 'config.toml');
}

function getBundledRecipesDirectory() {
  return fileURLToPath(new URL('../assets/default-recipes', import.meta.url));
}

function main() {
  try {
    mkdirSync(getCookRecipesDirectory(), { recursive: true });
    seedBundledRecipes();

    const configPath = getCookConfigPath();

    if (!existsSync(configPath)) {
      writeFileSync(configPath, DEFAULT_CONFIG_SOURCE, 'utf8');
    }
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`Failed to initialize Cook home directory: ${error.message}\n`);
      process.exitCode = 1;
      return;
    }

    process.stderr.write('Failed to initialize Cook home directory.\n');
    process.exitCode = 1;
  }
}

function seedBundledRecipes() {
  const sourceDirectory = getBundledRecipesDirectory();

  if (!existsSync(sourceDirectory)) {
    return;
  }

  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.rcp')) {
      continue;
    }

    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(getCookRecipesDirectory(), entry.name);

    if (!existsSync(targetPath)) {
      copyFileSync(sourcePath, targetPath);
    }
  }
}

main();

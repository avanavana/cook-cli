import { access, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export function getCookHomeDirectory(): string {
  return path.join(os.homedir(), '.cook');
}

export function getCookRecipesDirectory(): string {
  return path.join(getCookHomeDirectory(), 'recipes');
}

export function getCookConfigPath(): string {
  return path.join(getCookHomeDirectory(), 'config.toml');
}

export async function ensureCookRecipesDirectory(): Promise<string> {
  const recipesDirectory = getCookRecipesDirectory();

  await mkdir(recipesDirectory, { recursive: true });

  return recipesDirectory;
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

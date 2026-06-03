import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

import { parse as parseToml } from 'smol-toml';

import { getCookConfigPath } from './app-paths.js';

export interface CookUserConfig {
  editor?: string;
  maxDishes?: number;
  maxRenderedPaths?: number;
}

export async function loadCookConfig(): Promise<CookUserConfig> {
  try {
    const configSource = await readFile(getCookConfigPath(), 'utf8');
    const parsedConfig = parseToml(configSource);

    const config: CookUserConfig = {};

    if (typeof parsedConfig.editor === 'string') {
      config.editor = parsedConfig.editor;
    }

    if (isPositiveInteger(parsedConfig.max_dishes)) {
      config.maxDishes = parsedConfig.max_dishes;
    }

    if (isPositiveInteger(parsedConfig.max_rendered_paths)) {
      config.maxRenderedPaths = parsedConfig.max_rendered_paths;
    }

    return config;
  } catch {
    return {};
  }
}

export async function resolveEditorCommand(): Promise<string> {
  if (process.env.COOK_EDITOR) {
    return process.env.COOK_EDITOR;
  }

  const config = await loadCookConfig();

  if (config.editor) {
    return config.editor;
  }

  if (process.env.EDITOR) {
    return process.env.EDITOR;
  }

  return 'vi';
}

export async function openInEditor(targetPath: string): Promise<void> {
  const editorCommand = await resolveEditorCommand();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(`${editorCommand} "${targetPath}"`, {
      shell: true,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Editor exited with code ${code ?? 'unknown'}.`));
    });
  });
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

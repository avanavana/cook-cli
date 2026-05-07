import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

import { parse as parseToml } from 'smol-toml';

import { getCookConfigPath } from './app-paths.js';

export interface CookUserConfig {
  editor?: string;
}

export async function loadCookConfig(): Promise<CookUserConfig> {
  try {
    const configSource = await readFile(getCookConfigPath(), 'utf8');
    const parsedConfig = parseToml(configSource);

    return typeof parsedConfig.editor === 'string'
      ? { editor: parsedConfig.editor }
      : {};
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

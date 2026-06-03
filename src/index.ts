#!/usr/bin/env node

import { CommanderError } from 'commander';

import { createProgram } from './cli/program.js';
import { formatCookError, isCookError } from './core/cook-error.js';

async function main(): Promise<void> {
  try {
    await createProgram().parseAsync(normalizeArgv(process.argv));
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
        process.exitCode = 0;
        return;
      }

      process.exitCode = error.exitCode;
      return;
    }

    if (isCookError(error)) {
      process.stderr.write(`${formatCookError(error)}\nRun \`cook -h\` for usage guidance.\n`);
      process.exitCode = 1;
      return;
    }

    if (error instanceof Error) {
      process.stderr.write(`${error.message}\nRun \`cook -h\` for usage guidance.\n`);
      process.exitCode = 1;
      return;
    }

    process.stderr.write('An unknown error occurred.\nRun `cook -h` for usage guidance.\n');
    process.exitCode = 1;
  }
}

function normalizeArgv(argv: string[]): string[] {
  if (argv[2] !== '-i') {
    return argv;
  }

  return [ ...argv.slice(0, 2), 'raw', ...argv.slice(3) ];
}

void main();

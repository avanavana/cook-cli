#!/usr/bin/env node

import { createProgram } from './cli/program.js';
import { isCookError } from './core/cook-error.js';

async function main(): Promise<void> {
  try {
    await createProgram().parseAsync(normalizeArgv(process.argv));
  } catch (error) {
    if (isCookError(error)) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
      return;
    }

    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
      return;
    }

    process.stderr.write('An unknown error occurred.\n');
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

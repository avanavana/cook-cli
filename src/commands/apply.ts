import type { Command } from 'commander';

import type { CommonRecipeOptions } from './shared.js';
import { executeRecipeCommand } from './shared.js';

export function registerApplyCommand(program: Command): void {
  program
    .argument('<recipe>', 'saved recipe name, .rcp path, "-", or inline expression')
    .argument('[args...]', 'positional values for unbound variables')
    .option('-o, --out <path>', 'destination parent directory', process.cwd())
    .option('--force', 'overwrite files without prompting')
    .option('--no-clobber', 'skip files that already exist')
    .option('--merge', 'create missing entries but never overwrite content')
    .option('--variable <name=value>', 'bind a variable explicitly', collectValue, [])
    .option('--var <name=value>', 'alias for --variable', collectValue, [])
    .addHelpText(
      'afterAll',
      `
Examples:
  cook web-app my-app -o ~/Code
  cook ./recipes/web-app.rcp --variable project=my-app -o ~/Code
  cat quick.rcp | cook - --variable project=draft-project -o ~/Desktop
  cook 'project / src README.md' -o ~/Desktop
`
    )
    .action(async (recipe: string, args: string[], options: CommonRecipeOptions) => {
      const output = await executeRecipeCommand(recipe, args, {
        ...options,
        dryRun: false
      });

      process.stdout.write(`${output}\n`);
    });
}

function collectValue(value: string, values: string[]): string[] {
  return [ ...values, value ];
}

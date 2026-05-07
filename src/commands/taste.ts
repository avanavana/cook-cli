import { Command } from 'commander';

import type { CommonRecipeOptions } from './shared.js';
import { executeRecipeCommand } from './shared.js';

export function createTasteCommand(): Command {
  return new Command('taste')
    .summary('Preview a recipe without writing to disk')
    .description(
      [
        'Preview a recipe without writing to disk',
        '',
        'Examples:',
        '  cook taste web-app my-app -o ~/Code',
        '  cook taste ./recipes/app.rcp --variable project=my-app',
        '  cat quick.rcp | cook taste - --variable project=draft-project -o ~/Desktop',
        `  cook taste 'project / src README.md' -o ~/Desktop`
      ].join('\n')
    )
    .argument('<recipe>', 'saved recipe name, .rcp path, "-", or inline expression')
    .argument('[args...]', 'positional values for unbound variables')
    .option('-o, --out <path>', 'destination parent directory', process.cwd())
    .option('--force', 'show the preview as if overwrites were allowed')
    .option('--no-clobber', 'preview skip behavior for existing files')
    .option('--merge', 'preview merge behavior for existing files')
    .option('--variable <name=value>', 'bind a variable explicitly', collectValue, [])
    .option('--var <name=value>', 'alias for --variable', collectValue, [])
    .addHelpText(
      'afterAll',
      `
Examples:
  cook taste web-app my-app -o ~/Code
  cook taste ./recipes/app.rcp --variable project=my-app
  cat quick.rcp | cook taste - --variable project=draft-project -o ~/Desktop
  cook taste 'project / src README.md' -o ~/Desktop
`
    )
    .action(async (recipe: string, args: string[], options: CommonRecipeOptions) => {
      const output = await executeRecipeCommand(recipe, args, {
        ...options,
        dryRun: true
      });

      process.stdout.write(`${output}\n`);
    });
}

function collectValue(value: string, values: string[]): string[] {
  return [ ...values, value ];
}

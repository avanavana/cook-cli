import { Command } from 'commander';

import { readSavedRecipe } from '../config/recipe-store.js';

export function createShowCommand(): Command {
  return new Command('show')
    .description('Show a saved recipe')
    .argument('<name>', 'saved recipe name')
    .addHelpText(
      'afterAll',
      `
Examples:
  cook show web-app
`
    )
    .action(async (name: string) => {
      process.stdout.write(await readSavedRecipe(name));
    });
}

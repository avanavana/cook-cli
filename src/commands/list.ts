import { Command } from 'commander';

import { listSavedRecipes } from '../config/recipe-store.js';

export function createListCommand(): Command {
  return new Command('list')
    .description('List saved recipes')
    .addHelpText(
      'afterAll',
      `
Examples:
  cook list
`
    )
    .action(async () => {
      const recipes = await listSavedRecipes();

      process.stdout.write(`${recipes.join('\n')}${recipes.length > 0 ? '\n' : ''}`);
    });
}

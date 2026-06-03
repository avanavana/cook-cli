import { Command } from 'commander';

import { renameSavedRecipe } from '../config/recipe-store.js';

export function createRenameCommand(): Command {
  return new Command('rename')
    .description('Rename a saved recipe')
    .argument('<current-name>', 'existing saved recipe name')
    .argument('<next-name>', 'new saved recipe name')
    .addHelpText(
      'afterAll',
      `
Examples:
  cook rename example helloworld
`
    )
    .action(async (currentName: string, nextName: string) => {
      await renameSavedRecipe(currentName, nextName);
      process.stdout.write(`Renamed "${currentName}" to "${nextName}".\n`);
    });
}

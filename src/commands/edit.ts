import { Command } from 'commander';

import { pathExists } from '../config/app-paths.js';
import { openInEditor } from '../config/config.js';
import { getSavedRecipePath } from '../config/recipe-store.js';

export function createEditCommand(): Command {
  return new Command('edit')
    .description('Open a saved recipe in your configured editor')
    .argument('<name>', 'saved recipe name')
    .addHelpText(
      'afterAll',
      `
Examples:
  cook edit web-app
`
    )
    .action(async (name: string) => {
      const recipePath = getSavedRecipePath(name);

      if (!await pathExists(recipePath)) {
        throw new Error(`Saved recipe "${name}" does not exist.`);
      }

      await openInEditor(recipePath);
    });
}

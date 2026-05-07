import { Command } from 'commander';

import { cloneDirectoryToRecipe } from '../core/clone-recipe.js';
import { expandHomePath } from '../core/recipe-source.js';
import { saveRecipe } from '../config/recipe-store.js';

export function createCloneCommand(): Command {
  return new Command('clone')
    .description('Clone an existing directory tree into a saved .rcp recipe')
    .argument('<source-path>', 'directory to clone')
    .argument('<recipe-name>', 'name to save under ~/.cook/recipes')
    .option('--content', 'include file bodies in the generated recipe')
    .addHelpText(
      'afterAll',
      `
Examples:
  cook clone ./my-project web-app
  cook clone ./my-project web-app --content
`
    )
    .action(async (sourcePath: string, recipeName: string, options: { content?: boolean }) => {
      const recipeSource = await cloneDirectoryToRecipe(expandHomePath(sourcePath), {
        includeContent: Boolean(options.content)
      });
      const targetPath = await saveRecipe(recipeName, recipeSource);

      process.stdout.write(`${targetPath}\n`);
    });
}

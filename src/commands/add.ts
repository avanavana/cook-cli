import { readFile } from 'node:fs/promises';

import { Command } from 'commander';

import { saveRecipe } from '../config/recipe-store.js';
import { normalizeInlineExpressionToRecipe } from '../core/inline-recipe.js';
import { expandHomePath } from '../core/recipe-source.js';
import { hasPipedStdin, readProcessStdin } from '../core/stdin.js';

export function createAddCommand(): Command {
  return new Command('add')
    .description('Save a recipe into ~/.cook/recipes')
    .argument('<name>', 'saved recipe name')
    .argument('[source]', 'recipe path, inline expression, or omit to read from stdin')
    .addHelpText(
      'afterAll',
      `
Examples:
  cook add quick-start ./recipes/quick-start.rcp
  cook add scratch 'project / notes todos.md'
  cat recipe.rcp | cook add imported
`
    )
    .action(async (name: string, source: string | undefined) => {
      let recipeSource = source;

      if (!recipeSource) {
        if (!hasPipedStdin()) {
          throw new Error('Provide a source argument or pipe a recipe into stdin.');
        }

        recipeSource = await readProcessStdin();
      } else {
        const expandedPath = expandHomePath(recipeSource);

        try {
          recipeSource = await readFile(expandedPath, 'utf8');
        } catch {
          recipeSource = /\s/.test(recipeSource)
            ? normalizeInlineExpressionToRecipe(recipeSource)
            : undefined;
        }
      }

      if (!recipeSource) {
        throw new Error('Source must be an existing recipe file, stdin input, or an inline expression.');
      }

      const targetPath = await saveRecipe(name, recipeSource);

      process.stdout.write(`${targetPath}\n`);
    });
}

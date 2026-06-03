import { Command } from 'commander';

import { loadCookConfig } from '../config/config.js';
import { assertDishCountWithinLimit, assertRenderedPathCountWithinLimit, resolveExecutionLimits } from '../core/execution-limits.js';
import { parseRecipe } from '../core/parse-recipe.js';
import { renderRecipe } from '../core/render-recipe.js';
import { resolveRecipeSource } from '../core/recipe-source.js';
import { flattenRenderedNodes } from '../core/recipe-tree.js';
import { readProcessStdin } from '../core/stdin.js';
import { loadExpandedBindingSets } from '../core/resolve-variables.js';

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate a recipe without writing to disk')
    .argument('<recipe>', 'saved recipe name, .rcp path, "-", or inline expression')
    .argument('[args...]', 'positional values for unbound variables')
    .option('--variable <name=value>', 'bind a variable explicitly', collectValue, [])
    .option('--var <name=value>', 'alias for --variable', collectValue, [])
    .addHelpText(
      'afterAll',
      `
Examples:
  cook validate web-app my-app
  cook validate ./recipes/web-app.rcp --variable project=my-app
  cook validate 'project / src README.md'
`
    )
    .action(async (recipeArgument: string, args: string[], options: { variable?: string[]; var?: string[] }) => {
      const recipeSource = await resolveRecipeSource(recipeArgument);
      const recipe = parseRecipe(recipeSource.source);
      const explicitBindingSets = await loadExpandedBindingSets(
        [ ...(options.variable ?? []), ...(options.var ?? []) ],
        async () => readProcessStdin()
      );
      const limits = resolveExecutionLimits(await loadCookConfig());

      assertDishCountWithinLimit(explicitBindingSets.length, limits);

      let renderedPathCount = 0;
      const renderedRecipes = explicitBindingSets.map((explicitBindings) => renderRecipe(recipe, {
        explicitBindings,
        positionalArguments: args
      }));
      for (const renderedRecipe of renderedRecipes) {
        renderedPathCount += flattenRenderedNodes(renderedRecipe.roots).length;
        assertRenderedPathCountWithinLimit(renderedPathCount, limits);
      }
      const output = renderedRecipes.length === 1
        ? {
          ok: true,
          files: renderedRecipes[0]!.files.map((file) => file.relativePath),
          variables: renderedRecipes[0]!.bindings
        }
        : {
          ok: true,
          dishes: renderedRecipes.map((renderedRecipe) => ({
            files: renderedRecipe.files.map((file) => file.relativePath),
            variables: renderedRecipe.bindings
          }))
        };

      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    });
}

function collectValue(value: string, values: string[]): string[] {
  return [ ...values, value ];
}

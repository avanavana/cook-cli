import { Command } from 'commander';

import { parseRecipe } from '../core/parse-recipe.js';
import { renderRecipe } from '../core/render-recipe.js';
import { resolveRecipeSource } from '../core/recipe-source.js';
import { readProcessStdin } from '../core/stdin.js';
import { loadExplicitBindings } from '../core/resolve-variables.js';

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
      const explicitBindings = await loadExplicitBindings(
        [ ...(options.variable ?? []), ...(options.var ?? []) ],
        async () => readProcessStdin()
      );
      const renderedRecipe = renderRecipe(recipe, {
        explicitBindings,
        positionalArguments: args
      });
      const output = {
        ok: true,
        files: renderedRecipe.files.map((file) => file.relativePath),
        variables: renderedRecipe.bindings
      };

      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    });
}

function collectValue(value: string, values: string[]): string[] {
  return [ ...values, value ];
}

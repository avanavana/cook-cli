import { readFile } from 'node:fs/promises';

import { CookError } from './cook-error.js';
import { collectNamedVariablesFromTemplate } from './template-expressions.js';
import type { RecipeTemplate, VariableResolutionOptions } from './recipe-types.js';

export async function loadExplicitBindings(
  variableFlags: string[],
  readStdinValue: (() => Promise<string>) | undefined
): Promise<Record<string, string>> {
  const bindings: Record<string, string> = {};

  for (const variableFlag of variableFlags) {
    const match = variableFlag.match(/^([A-Za-z_][A-Za-z0-9_-]*)(=|@)(.*)$/);

    if (!match) {
      throw new CookError(
        'INVALID_VARIABLE_FLAG',
        `Invalid variable binding "${variableFlag}". Use name=value or name@path.`
      );
    }

    const name = match[1];
    const operator = match[2];
    const rawValue = match[3];

    if (!name || !operator || rawValue === undefined) {
      throw new CookError(
        'INVALID_VARIABLE_FLAG',
        `Invalid variable binding "${variableFlag}". Use name=value or name@path.`
      );
    }

    if (operator === '=') {
      bindings[name] = rawValue;
      continue;
    }

    if (rawValue === '-') {
      if (!readStdinValue) {
        throw new CookError(
          'STDIN_UNAVAILABLE',
          `Variable "${name}" requested stdin input, but stdin is not available.`
        );
      }

      bindings[name] = stripTrailingNewline(await readStdinValue());
      continue;
    }

    bindings[name] = stripTrailingNewline(await readFile(rawValue, 'utf8'));
  }

  return bindings;
}

export function collectRecipeVariableNames(recipe: RecipeTemplate): string[] {
  const orderedNames: string[] = [];
  const seenNames = new Set<string>();

  function recordName(name: string): void {
    if (!seenNames.has(name)) {
      seenNames.add(name);
      orderedNames.push(name);
    }
  }

  function visitNodeNames(nodeNames: string[]): void {
    for (const nodeName of nodeNames) {
      for (const variableName of collectNamedVariablesFromTemplate(nodeName, { allowExpansions: true })) {
        recordName(variableName);
      }
    }
  }

  function visitOutline(): void {
    const queue = [ ...recipe.outline ];

    while (queue.length > 0) {
      const node = queue.shift();

      if (!node) {
        continue;
      }

      visitNodeNames([ node.name ]);
      queue.unshift(...node.children);
    }
  }

  visitOutline();

  for (const block of recipe.contentBlocks) {
    visitNodeNames([ block.header ]);

    for (const variableName of collectNamedVariablesFromTemplate(block.body, { allowExpansions: false })) {
      recordName(variableName);
    }
  }

  return orderedNames;
}

export function resolveRecipeBindings(
  recipe: RecipeTemplate,
  options: VariableResolutionOptions = {}
): { bindings: Record<string, string>; variableOrder: string[] } {
  const variableOrder = collectRecipeVariableNames(recipe);
  const bindings: Record<string, string> = {
    ...(options.explicitBindings ?? {})
  };
  const positionalArguments = [ ...(options.positionalArguments ?? []) ];

  for (const variableName of variableOrder) {
    if (bindings[variableName] !== undefined) {
      continue;
    }

    const positionalValue = positionalArguments.shift();

    if (positionalValue !== undefined) {
      bindings[variableName] = positionalValue;
    }
  }

  const missingVariables = variableOrder.filter((variableName) => bindings[variableName] === undefined);

  if (missingVariables.length > 0) {
    throw new CookError(
      'UNRESOLVED_VARIABLE',
      `Missing values for variable${missingVariables.length === 1 ? '' : 's'}: ${missingVariables.join(', ')}.`
    );
  }

  if (positionalArguments.length > 0) {
    throw new CookError(
      'UNUSED_POSITIONAL_ARGUMENTS',
      `Received ${positionalArguments.length} extra positional argument${positionalArguments.length === 1 ? '' : 's'}.`
    );
  }

  return {
    bindings,
    variableOrder
  };
}

function stripTrailingNewline(value: string): string {
  if (value.endsWith('\r\n')) {
    return value.slice(0, -2);
  }

  if (value.endsWith('\n')) {
    return value.slice(0, -1);
  }

  return value;
}

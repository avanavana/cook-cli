import { readFile } from 'node:fs/promises';

import { CookError } from './cook-error.js';
import { parsePlaceholderToken } from './template-expressions.js';
import { collectNamedVariablesFromTemplate } from './template-expressions.js';
import type { RecipeTemplate, VariableResolutionOptions } from './recipe-types.js';

interface ResolvedVariableBinding {
  name: string;
  value: string;
}

export async function loadExplicitBindings(
  variableFlags: string[],
  readStdinValue: (() => Promise<string>) | undefined
): Promise<Record<string, string>> {
  const bindings: Record<string, string> = {};

  for (const variableFlag of variableFlags) {
    const binding = await resolveVariableBinding(variableFlag, readStdinValue);

    bindings[binding.name] = binding.value;
  }

  return bindings;
}

export async function loadExpandedBindingSets(
  variableFlags: string[],
  readStdinValue: (() => Promise<string>) | undefined
): Promise<Record<string, string>[]> {
  let bindingSets: Record<string, string>[] = [ {} ];

  for (const variableFlag of variableFlags) {
    const binding = await resolveVariableBinding(variableFlag, readStdinValue);
    const expandedValues = expandVariableBindingValue(binding.name, binding.value);
    const nextBindingSets: Record<string, string>[] = [];

    for (const currentBindingSet of bindingSets) {
      for (const expandedValue of expandedValues) {
        nextBindingSets.push({
          ...currentBindingSet,
          [binding.name]: expandedValue
        });
      }
    }

    bindingSets = nextBindingSets;
  }

  return bindingSets;
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

async function resolveVariableBinding(
  variableFlag: string,
  readStdinValue: (() => Promise<string>) | undefined
): Promise<ResolvedVariableBinding> {
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
    return {
      name,
      value: rawValue
    };
  }

  if (rawValue === '-') {
    if (!readStdinValue) {
      throw new CookError(
        'STDIN_UNAVAILABLE',
        `Variable "${name}" requested stdin input, but stdin is not available.`
      );
    }

    return {
      name,
      value: stripTrailingNewline(await readStdinValue())
    };
  }

  return {
    name,
    value: stripTrailingNewline(await readFile(rawValue, 'utf8'))
  };
}

function expandVariableBindingValue(name: string, value: string): string[] {
  let results = [ value ];
  const matches = [ ...value.matchAll(/{{([^{}]+)}}/g) ];

  if (matches.length === 0) {
    return results;
  }

  for (const match of matches) {
    const rawExpression = match[0];
    const expression = match[1]?.trim() ?? '';
    const token = parsePlaceholderToken(expression);

    if (token.type !== 'expansion') {
      throw new CookError(
        'INVALID_VARIABLE_FLAG',
        `Variable "${name}" can only use structural expansions inside "{{...}}" values.`
      );
    }

    const nextResults: string[] = [];

    for (const current of results) {
      for (const expandedValue of token.values) {
        nextResults.push(current.replace(rawExpression, expandedValue));
      }
    }

    results = nextResults;
  }

  return results;
}

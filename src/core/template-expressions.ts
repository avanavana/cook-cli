import { CookError } from './cook-error.js';

export type PlaceholderToken =
  | { type: 'variable'; name: string }
  | { type: 'expansion'; values: string[] };

const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const NUMERIC_RANGE_PATTERN = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/;
const ALPHA_RANGE_PATTERN = /^([A-Za-z])\.\.([A-Za-z])$/;

export function isVariableName(value: string): boolean {
  return VARIABLE_NAME_PATTERN.test(value);
}

export function extractPlaceholderExpressions(template: string): string[] {
  const expressions: string[] = [];
  const pattern = /{{([^{}]+)}}/g;

  for (const match of template.matchAll(pattern)) {
    const expression = match[1]?.trim();

    if (expression) {
      expressions.push(expression);
    }
  }

  return expressions;
}

export function collectNamedVariablesFromTemplate(
  template: string,
  options: { allowExpansions: boolean }
): string[] {
  const names: string[] = [];

  for (const expression of extractPlaceholderExpressions(template)) {
    if (isVariableName(expression)) {
      names.push(expression);
      continue;
    }

    if (options.allowExpansions && isExpansionExpression(expression)) {
      continue;
    }
  }

  return names;
}

export function expandPathTemplate(
  template: string,
  bindings: Record<string, string>
): string[] {
  let results = [ template ];
  const pattern = /{{([^{}]+)}}/g;

  for (const match of template.matchAll(pattern)) {
    const rawExpression = match[0];
    const expression = match[1]?.trim() ?? '';
    const token = parsePlaceholderToken(expression);
    const nextResults: string[] = [];

    for (const current of results) {
      if (token.type === 'variable') {
        const value = bindings[token.name];

        if (value === undefined) {
          throw new CookError(
            'UNRESOLVED_VARIABLE',
            `Missing value for variable "${token.name}".`
          );
        }

        nextResults.push(current.replace(rawExpression, value));
      } else {
        for (const expandedValue of token.values) {
          nextResults.push(current.replace(rawExpression, expandedValue));
        }
      }
    }

    results = nextResults;
  }

  return results;
}

export function interpolateBodyTemplate(
  template: string,
  bindings: Record<string, string>
): string {
  return template.replace(/{{([^{}]+)}}/g, (fullMatch, rawExpression: string) => {
    const expression = rawExpression.trim();

    if (!isVariableName(expression)) {
      return fullMatch;
    }

    const value = bindings[expression];

    if (value === undefined) {
      throw new CookError(
        'UNRESOLVED_VARIABLE',
        `Missing value for variable "${expression}".`
      );
    }

    return value;
  });
}

export function isExpansionExpression(expression: string): boolean {
  try {
    return parsePlaceholderToken(expression).type === 'expansion';
  } catch {
    return false;
  }
}

export function parsePlaceholderToken(expression: string): PlaceholderToken {
  if (isVariableName(expression)) {
    return {
      type: 'variable',
      name: expression
    };
  }

  const numericRangeMatch = expression.match(NUMERIC_RANGE_PATTERN);

  if (numericRangeMatch) {
    const rawStart = numericRangeMatch[1];
    const rawEnd = numericRangeMatch[2];
    const explicitStep = numericRangeMatch[3];

    if (!rawStart || !rawEnd) {
      throw new CookError('INVALID_EXPANSION', `Expansion "{{${expression}}}" is invalid.`);
    }

    const start = Number.parseInt(rawStart, 10);
    const end = Number.parseInt(rawEnd, 10);
    const defaultStep = start <= end ? 1 : -1;
    const step = explicitStep === undefined ? defaultStep : Number.parseInt(explicitStep, 10);

    if (step === 0) {
      throw new CookError('INVALID_EXPANSION', `Expansion "{{${expression}}}" cannot use a zero step.`);
    }

    if (start < end && step < 0) {
      throw new CookError(
        'INVALID_EXPANSION',
        `Expansion "{{${expression}}}" uses a negative step for an ascending range.`
      );
    }

    if (start > end && step > 0) {
      throw new CookError(
        'INVALID_EXPANSION',
        `Expansion "{{${expression}}}" must use an explicit negative step for a descending range.`
      );
    }

    const values: string[] = [];

    if (step > 0) {
      for (let current = start; current <= end; current += step) {
        values.push(String(current));
      }
    } else {
      for (let current = start; current >= end; current += step) {
        values.push(String(current));
      }
    }

    if (values.length === 0) {
      throw new CookError('INVALID_EXPANSION', `Expansion "{{${expression}}}" produced no values.`);
    }

    return {
      type: 'expansion',
      values
    };
  }

  const alphaRangeMatch = expression.match(ALPHA_RANGE_PATTERN);

  if (alphaRangeMatch) {
    const rawStart = alphaRangeMatch[1];
    const rawEnd = alphaRangeMatch[2];

    if (!rawStart || !rawEnd) {
      throw new CookError('INVALID_EXPANSION', `Expansion "{{${expression}}}" is invalid.`);
    }

    const start = rawStart.codePointAt(0);
    const end = rawEnd.codePointAt(0);

    if (start === undefined || end === undefined) {
      throw new CookError('INVALID_EXPANSION', `Expansion "{{${expression}}}" is invalid.`);
    }

    if (start > end) {
      throw new CookError(
        'INVALID_EXPANSION',
        `Expansion "{{${expression}}}" must ascend from the first letter to the second letter.`
      );
    }

    const values: string[] = [];

    for (let current = start; current <= end; current += 1) {
      values.push(String.fromCodePoint(current));
    }

    return {
      type: 'expansion',
      values
    };
  }

  if (expression.includes(',')) {
    const values = expression
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      throw new CookError('INVALID_EXPANSION', `Expansion "{{${expression}}}" must contain at least one item.`);
    }

    return {
      type: 'expansion',
      values
    };
  }

  throw new CookError('INVALID_PLACEHOLDER', `Invalid placeholder expression "{{${expression}}}".`);
}

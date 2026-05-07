import { CookError } from './cook-error.js';

interface InlineNode {
  name: string;
  children: InlineNode[];
}

export function parseInlineExpression(expression: string): InlineNode {
  const tokens = tokenizeInlineExpression(expression);

  if (tokens.length === 0) {
    throw new CookError('INVALID_INLINE_RECIPE', 'Inline expressions cannot be empty.');
  }

  let root: InlineNode | undefined;
  let currentParent: InlineNode | undefined;
  let pendingDescend = false;
  let lastCreatedNode: InlineNode | undefined;
  const parentStack: InlineNode[] = [];

  for (const token of tokens) {
    if (token === '/') {
      if (!lastCreatedNode) {
        throw new CookError('INVALID_INLINE_RECIPE', 'The "/" token must follow a node name.');
      }

      if (looksLikeFileName(lastCreatedNode.name)) {
        throw new CookError('INVALID_INLINE_RECIPE', `Cannot descend into file "${lastCreatedNode.name}".`);
      }

      pendingDescend = true;
      continue;
    }

    if (token === '..') {
      if (parentStack.length === 0) {
        throw new CookError('INVALID_INLINE_RECIPE', 'The ".." token cannot move above the root node.');
      }

      currentParent = parentStack.pop();
      lastCreatedNode = currentParent;
      pendingDescend = false;
      continue;
    }

    if (!root) {
      root = {
        name: token,
        children: []
      };
      currentParent = root;
      lastCreatedNode = root;
      continue;
    }

    if (pendingDescend) {
      parentStack.push(currentParent ?? root);
      currentParent = lastCreatedNode;
      pendingDescend = false;
    }

    const parent = currentParent ?? root;
    const node: InlineNode = {
      name: token,
      children: []
    };

    parent.children.push(node);
    lastCreatedNode = node;
  }

  if (!root) {
    throw new CookError('INVALID_INLINE_RECIPE', 'Inline expressions must define at least one node.');
  }

  if (pendingDescend) {
    throw new CookError('INVALID_INLINE_RECIPE', 'The "/" token must be followed by a node name.');
  }

  return root;
}

export function normalizeInlineExpressionToRecipe(expression: string): string {
  const root = parseInlineExpression(expression);
  const lines: string[] = [];

  function visit(node: InlineNode, depth: number): void {
    lines.push(`${'  '.repeat(depth)}${node.name}`);

    for (const child of node.children) {
      visit(child, depth + 1);
    }
  }

  visit(root, 0);

  return lines.join('\n');
}

function tokenizeInlineExpression(expression: string): string[] {
  const tokens: string[] = [];
  let currentToken = '';
  let inQuotes = false;
  let escaping = false;

  function commitToken(): void {
    if (currentToken !== '') {
      tokens.push(currentToken);
      currentToken = '';
    }
  }

  for (const character of expression) {
    if (escaping) {
      currentToken += character;
      escaping = false;
      continue;
    }

    if (character === '\\' && inQuotes) {
      escaping = true;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && /\s/.test(character)) {
      commitToken();
      continue;
    }

    currentToken += character;
  }

  if (inQuotes) {
    throw new CookError('INVALID_INLINE_RECIPE', 'Inline expression contains an unterminated quote.');
  }

  if (escaping) {
    throw new CookError('INVALID_INLINE_RECIPE', 'Inline expression ends with a dangling escape sequence.');
  }

  commitToken();

  return tokens;
}

function looksLikeFileName(value: string): boolean {
  return value.startsWith('.') || value.includes('.');
}

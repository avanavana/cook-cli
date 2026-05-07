import path from 'node:path';

import { CookError } from './cook-error.js';
import { buildTemplatePathEntries } from './recipe-tree.js';
import type {
  RecipeContentBlockTemplate,
  RecipeNodeTemplate,
  RecipeTemplate
} from './recipe-types.js';

interface PendingNode {
  indent: number;
  node: RecipeNodeTemplate;
}

export function parseRecipe(source: string): RecipeTemplate {
  const normalizedSource = source.replace(/\r\n/g, '\n');
  const lines = normalizedSource.split('\n');

  if (lines.every((line) => line.trim() === '')) {
    throw new CookError('EMPTY_RECIPE', 'Recipe files cannot be empty.');
  }

  const firstBlankLineIndex = lines.findIndex((line) => line.trim() === '');
  const structureEndIndex = firstBlankLineIndex === -1 ? lines.length : firstBlankLineIndex;
  const structureLines = lines.slice(0, structureEndIndex);

  if (structureLines.length === 0) {
    throw new CookError('INVALID_STRUCTURE', 'The structure block must start at line 1.');
  }

  const outline = parseStructureBlock(structureLines);
  const contentBlocks = parseContentBlocks(lines, structureEndIndex);

  const recipe: RecipeTemplate = {
    source: normalizedSource,
    outline,
    contentBlocks,
    indentationWidth: inferIndentationWidth(structureLines)
  };

  markContentBlockTargets(recipe);

  return recipe;
}

function parseStructureBlock(lines: string[]): RecipeNodeTemplate[] {
  const roots: RecipeNodeTemplate[] = [];
  const stack: PendingNode[] = [];
  const indentationWidth = inferIndentationWidth(lines);

  for (const [ index, line ] of lines.entries()) {
    if (line.includes('\t')) {
      throw new CookError('INVALID_INDENTATION', `Tabs are not allowed in the structure block (line ${index + 1}).`);
    }

    if (line.trim() === '') {
      throw new CookError('INVALID_STRUCTURE', `Blank lines are not allowed in the structure block (line ${index + 1}).`);
    }

    const indent = countLeadingSpaces(line);
    const name = line.trim();

    validateNodeName(name, index + 1);

    if (indentationWidth !== null) {
      if (indent % indentationWidth !== 0) {
        throw new CookError(
          'INVALID_INDENTATION',
          `Line ${index + 1} does not align to the recipe indentation width of ${indentationWidth} spaces.`
        );
      }

      if (stack.length > 0) {
        const previousIndent = stack[stack.length - 1]?.indent ?? 0;

        if (indent > previousIndent + indentationWidth) {
          throw new CookError(
            'INVALID_INDENTATION',
            `Line ${index + 1} increases indentation by more than one level.`
          );
        }
      }
    } else if (indent > 0) {
      throw new CookError(
        'INVALID_INDENTATION',
        `Line ${index + 1} is indented before the recipe establishes an indentation width.`
      );
    }

    while (stack.length > 0 && indent <= (stack[stack.length - 1]?.indent ?? 0)) {
      stack.pop();
    }

    const node: RecipeNodeTemplate = {
      id: `node-${index + 1}-${roots.length + stack.length}`,
      name,
      line: index + 1,
      children: [],
      forcedFile: false
    };

    const parent = stack[stack.length - 1]?.node;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push({
      indent,
      node
    });
  }

  return roots;
}

function parseContentBlocks(lines: string[], structureEndIndex: number): RecipeContentBlockTemplate[] {
  const blocks: RecipeContentBlockTemplate[] = [];
  let index = structureEndIndex;

  while (index < lines.length && lines[index]?.trim() === '') {
    index += 1;
  }

  while (index < lines.length) {
    const header = lines[index] ?? '';

    if (header.trim() === '') {
      index += 1;
      continue;
    }

    if (header.startsWith(' ') || header.startsWith('\t')) {
      throw new CookError(
        'INVALID_CONTENT_BLOCK',
        `File definition headers cannot be indented (line ${index + 1}).`
      );
    }

    const separator = lines[index + 1];

    if (separator !== '---') {
      throw new CookError(
        'INVALID_CONTENT_BLOCK',
        `Expected "---" after file definition header "${header}" on line ${index + 1}.`
      );
    }

    const bodyLines: string[] = [];
    let cursor = index + 2;

    while (cursor < lines.length) {
      const nextHeader = lines[cursor];
      const nextSeparator = lines[cursor + 1];

      if (
        nextHeader !== undefined &&
        nextHeader.trim() !== '' &&
        !nextHeader.startsWith(' ') &&
        !nextHeader.startsWith('\t') &&
        nextSeparator === '---'
      ) {
        break;
      }

      bodyLines.push(nextHeader ?? '');
      cursor += 1;
    }

    blocks.push({
      header,
      body: bodyLines.join('\n'),
      startLine: index + 1
    });

    index = cursor;
  }

  return blocks;
}

function markContentBlockTargets(recipe: RecipeTemplate): void {
  const entries = buildTemplatePathEntries(recipe.outline);
  const entryByFullPath = new Map(entries.map((entry) => [ entry.relativePath, entry.node ]));
  const entryByLeafName = new Map<string, RecipeNodeTemplate[]>();

  for (const entry of entries) {
    if (entry.node.children.length > 0) {
      continue;
    }

    const leafName = path.posix.basename(entry.relativePath);
    const matches = entryByLeafName.get(leafName) ?? [];

    matches.push(entry.node);
    entryByLeafName.set(leafName, matches);
  }

  for (const block of recipe.contentBlocks) {
    const targetNode = block.header.includes('/')
      ? entryByFullPath.get(block.header)
      : resolveUniqueLeaf(entryByLeafName, block.header, block.startLine);

    if (!targetNode) {
      throw new CookError(
        'MISSING_CONTENT_TARGET',
        `Content block "${block.header}" on line ${block.startLine} does not match any outline entry.`
      );
    }

    if (targetNode.children.length > 0) {
      throw new CookError(
        'DIRECTORY_CONTENT_TARGET',
        `Content block "${block.header}" on line ${block.startLine} targets a directory.`
      );
    }

    targetNode.forcedFile = true;
  }
}

function resolveUniqueLeaf(
  entryByLeafName: Map<string, RecipeNodeTemplate[]>,
  header: string,
  line: number
): RecipeNodeTemplate | undefined {
  const matches = entryByLeafName.get(header) ?? [];

  if (matches.length > 1) {
    throw new CookError(
      'AMBIGUOUS_CONTENT_TARGET',
      `Content block "${header}" on line ${line} is ambiguous. Use the full relative path instead.`
    );
  }

  return matches[0];
}

function inferIndentationWidth(lines: string[]): number | null {
  for (const line of lines) {
    const spaces = countLeadingSpaces(line);

    if (spaces > 0) {
      return spaces;
    }
  }

  return null;
}

function countLeadingSpaces(value: string): number {
  const match = value.match(/^ */);

  return match?.[0].length ?? 0;
}

function validateNodeName(name: string, line: number): void {
  if (name === '.' || name === '..') {
    throw new CookError('INVALID_NODE_NAME', `Line ${line} uses a reserved path segment "${name}".`);
  }

  if (path.isAbsolute(name) || name.startsWith('~/')) {
    throw new CookError('INVALID_NODE_NAME', `Line ${line} contains an absolute path. Recipe paths must be relative.`);
  }

  if (name.includes('/')) {
    throw new CookError(
      'INVALID_NODE_NAME',
      `Line ${line} contains "/". Structure lines must describe one path segment at a time.`
    );
  }
}

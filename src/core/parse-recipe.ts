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

  const structureStartIndex = lines.findIndex((line) => !isIgnorableOutsideContentBlock(line));

  if (structureStartIndex === -1) {
    throw new CookError('EMPTY_RECIPE', 'Recipe files cannot be empty.');
  }

  const firstBlankLineIndex = lines.findIndex(
    (line, index) => index >= structureStartIndex && line.trim() === ''
  );
  const structureEndIndex = firstBlankLineIndex === -1 ? lines.length : firstBlankLineIndex;
  const structureLines = lines.slice(structureStartIndex, structureEndIndex);

  if (structureLines.every((line) => isCommentLine(line))) {
    throw new CookError('INVALID_STRUCTURE', 'Recipes must define at least one outline entry.');
  }

  const outline = parseStructureBlock(structureLines, structureStartIndex + 1);
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

function parseStructureBlock(lines: string[], startLine: number): RecipeNodeTemplate[] {
  const roots: RecipeNodeTemplate[] = [];
  const stack: PendingNode[] = [];
  const indentationWidth = inferIndentationWidth(lines);

  for (const [ index, line ] of lines.entries()) {
    const lineNumber = startLine + index;

    if (isCommentLine(line)) {
      continue;
    }

    if (line.includes('\t')) {
      throw new CookError('INVALID_INDENTATION', `Tabs are not allowed in the structure block (line ${lineNumber}).`);
    }

    if (line.trim() === '') {
      throw new CookError('INVALID_STRUCTURE', `Blank lines are not allowed in the structure block (line ${lineNumber}).`);
    }

    const indent = countLeadingSpaces(line);
    const name = line.trim();

    validateNodeName(name, lineNumber);

    if (indentationWidth !== null) {
      if (indent % indentationWidth !== 0) {
        throw new CookError(
          'INVALID_INDENTATION',
          `Line ${lineNumber} does not align to the recipe indentation width of ${indentationWidth} spaces.`
        );
      }

      if (stack.length > 0) {
        const previousIndent = stack[stack.length - 1]?.indent ?? 0;

        if (indent > previousIndent + indentationWidth) {
          throw new CookError(
            'INVALID_INDENTATION',
            `Line ${lineNumber} increases indentation by more than one level.`
          );
        }
      }
    } else if (indent > 0) {
      throw new CookError(
        'INVALID_INDENTATION',
        `Line ${lineNumber} is indented before the recipe establishes an indentation width.`
      );
    }

    while (stack.length > 0 && indent <= (stack[stack.length - 1]?.indent ?? 0)) {
      stack.pop();
    }

    const node: RecipeNodeTemplate = {
      id: `node-${lineNumber}-${roots.length + stack.length}`,
      name,
      line: lineNumber,
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

  while (index < lines.length && isIgnorableOutsideContentBlock(lines[index] ?? '')) {
    index += 1;
  }

  while (index < lines.length) {
    const header = lines[index] ?? '';

    if (isIgnorableOutsideContentBlock(header)) {
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
        !isIgnorableOutsideContentBlock(nextHeader) &&
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
    if (isCommentLine(line)) {
      continue;
    }

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

function isCommentLine(line: string): boolean {
  return line.trimStart().startsWith('#');
}

function isIgnorableOutsideContentBlock(line: string): boolean {
  return line.trim() === '' || isCommentLine(line);
}

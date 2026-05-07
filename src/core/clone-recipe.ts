import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

interface ClonedNode {
  name: string;
  type: 'file' | 'directory';
  children: ClonedNode[];
  relativePath: string;
}

export async function cloneDirectoryToRecipe(
  sourcePath: string,
  options: { includeContent: boolean }
): Promise<string> {
  const rootName = path.basename(sourcePath);
  const rootNode = await cloneNode(sourcePath, rootName, '');
  const lines: string[] = [];
  const files: ClonedNode[] = [];

  function visit(node: ClonedNode, depth: number): void {
    lines.push(`${'  '.repeat(depth)}${node.name}`);

    if (node.type === 'file') {
      files.push(node);
      return;
    }

    for (const child of node.children) {
      visit(child, depth + 1);
    }
  }

  visit(rootNode, 0);

  const contentBlocks = await buildContentBlocks(files, sourcePath, options.includeContent);

  return contentBlocks.length === 0
    ? lines.join('\n')
    : `${lines.join('\n')}\n\n${contentBlocks.join('\n\n')}`;
}

async function cloneNode(
  sourcePath: string,
  name: string,
  relativePath: string
): Promise<ClonedNode> {
  const entries = await readdir(sourcePath, { withFileTypes: true });
  const children: ClonedNode[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (shouldIgnoreEntry(entry.name)) {
      continue;
    }

    const childPath = path.join(sourcePath, entry.name);
    const childRelativePath = relativePath === '' ? entry.name : path.posix.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      children.push(await cloneNode(childPath, entry.name, childRelativePath));
      continue;
    }

    if (entry.isFile()) {
      children.push({
        name: entry.name,
        type: 'file',
        children: [],
        relativePath: childRelativePath
      });
    }
  }

  return {
    name,
    type: 'directory',
    children,
    relativePath
  };
}

async function buildContentBlocks(
  files: ClonedNode[],
  sourceRoot: string,
  includeContent: boolean
): Promise<string[]> {
  const duplicateCounts = new Map<string, number>();

  for (const file of files) {
    duplicateCounts.set(file.name, (duplicateCounts.get(file.name) ?? 0) + 1);
  }

  const blocks: string[] = [];

  for (const file of files) {
    if (includeContent) {
      const sourcePath = path.join(sourceRoot, file.relativePath);
      const content = await readFile(sourcePath, 'utf8');
      const header = duplicateCounts.get(file.name) === 1 ? file.name : file.relativePath;

      blocks.push(`${header}\n---\n${content}`);
      continue;
    }

    if (!looksLikeFileName(file.name)) {
      const header = duplicateCounts.get(file.name) === 1 ? file.name : file.relativePath;

      blocks.push(`${header}\n---`);
    }
  }

  return blocks;
}

function shouldIgnoreEntry(name: string): boolean {
  return name === '.DS_Store' || name === 'node_modules' || name === '.git';
}

function looksLikeFileName(value: string): boolean {
  return value.startsWith('.') || value.includes('.');
}

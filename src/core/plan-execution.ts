import { lstat } from 'node:fs/promises';
import path from 'node:path';

import { flattenRenderedNodes } from './recipe-tree.js';
import type {
  DirectoryPlanEntry,
  ExecutionPlan,
  FilePlanEntry,
  RenderedRecipe
} from './recipe-types.js';
import { renderTree } from '../utils/format-tree.js';

export type ConflictStrategy = 'error' | 'overwrite' | 'skip';

export async function planExecution(
  renderedRecipe: RenderedRecipe,
  options: {
    outDirectory: string;
    conflictStrategy: ConflictStrategy;
  }
): Promise<ExecutionPlan> {
  const normalizedOutDirectory = path.resolve(options.outDirectory);
  const renderedNodes = flattenRenderedNodes(renderedRecipe.roots);
  const directories: DirectoryPlanEntry[] = renderedNodes
    .filter((node) => node.type === 'directory')
    .map<DirectoryPlanEntry>((node) => ({
      relativePath: node.relativePath,
      absolutePath: path.join(normalizedOutDirectory, node.relativePath),
      status: 'create'
    }))
    .sort((left, right) => depthOfPath(left.relativePath) - depthOfPath(right.relativePath));
  const fileContentByPath = new Map(renderedRecipe.files.map((file) => [ file.relativePath, file.content ]));
  const files: FilePlanEntry[] = [];
  const conflicts: string[] = [];

  for (const directory of directories) {
    const stat = await safeLstat(directory.absolutePath);

    if (!stat) {
      continue;
    }

    if (!stat.isDirectory()) {
      directory.status = 'conflict';
      directory.reason = 'A file already exists where a directory is required.';
      conflicts.push(directory.absolutePath);
    } else {
      directory.status = 'existing';
    }
  }

  for (const node of renderedNodes) {
    if (node.type !== 'file') {
      continue;
    }

    const absolutePath = path.join(normalizedOutDirectory, node.relativePath);
    const stat = await safeLstat(absolutePath);
    const fileEntry: FilePlanEntry = {
      relativePath: node.relativePath,
      absolutePath,
      content: fileContentByPath.get(node.relativePath) ?? '',
      status: 'create'
    };

    if (stat) {
      if (!stat.isFile()) {
        fileEntry.status = 'conflict';
        fileEntry.reason = 'A directory already exists where a file is required.';
        conflicts.push(absolutePath);
      } else if (options.conflictStrategy === 'overwrite') {
        fileEntry.status = 'overwrite';
      } else if (options.conflictStrategy === 'skip') {
        fileEntry.status = 'skip';
      } else {
        fileEntry.status = 'conflict';
        fileEntry.reason = 'The file already exists.';
        conflicts.push(absolutePath);
      }
    }

    files.push(fileEntry);
  }

  return {
    outDirectory: normalizedOutDirectory,
    directories,
    files,
    bindings: renderedRecipe.bindings,
    tree: renderTree(renderedRecipe.roots),
    conflicts
  };
}

async function safeLstat(targetPath: string) {
  try {
    return await lstat(targetPath);
  } catch {
    return undefined;
  }
}

function depthOfPath(relativePath: string): number {
  return relativePath.split('/').length;
}

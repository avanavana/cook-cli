import path from 'node:path';

import { CookError } from './cook-error.js';
import { flattenRenderedNodes } from './recipe-tree.js';
import { interpolateBodyTemplate, expandPathTemplate } from './template-expressions.js';
import { resolveRecipeBindings } from './resolve-variables.js';
import type {
  RecipeNodeTemplate,
  RecipeTemplate,
  RenderedRecipe,
  RenderedRecipeFile,
  RenderedRecipeNode,
  VariableResolutionOptions
} from './recipe-types.js';

export function renderRecipe(
  recipe: RecipeTemplate,
  options: VariableResolutionOptions = {}
): RenderedRecipe {
  const { bindings, variableOrder } = resolveRecipeBindings(recipe, options);
  const seenPaths = new Set<string>();
  const renderedRoots = renderNodes(recipe.outline, '', bindings, seenPaths);
  const renderedFiles = attachContentBlocks(recipe, renderedRoots, bindings);

  return {
    roots: renderedRoots,
    files: renderedFiles,
    bindings,
    variableOrder
  };
}

function renderNodes(
  templates: RecipeNodeTemplate[],
  parentPath: string,
  bindings: Record<string, string>,
  seenPaths: Set<string>
): RenderedRecipeNode[] {
  const renderedNodes: RenderedRecipeNode[] = [];

  for (const template of templates) {
    const expandedNames = expandPathTemplate(template.name, bindings);

    for (const expandedName of expandedNames) {
      validateRenderedSegment(expandedName, template.line);

      const relativePath = parentPath === '' ? expandedName : path.posix.join(parentPath, expandedName);

      if (seenPaths.has(relativePath)) {
        throw new CookError('DUPLICATE_PATH', `Recipe renders the path "${relativePath}" more than once.`);
      }

      const childSeenPaths = new Set<string>();
      const renderedChildren = renderNodes(template.children, relativePath, bindings, childSeenPaths);
      const siblingNames = new Set<string>();

      for (const child of renderedChildren) {
        if (siblingNames.has(child.name)) {
          throw new CookError(
            'DUPLICATE_SIBLING',
            `Recipe renders duplicate sibling names under "${relativePath}": "${child.name}".`
          );
        }

        siblingNames.add(child.name);
      }

      const type = renderedChildren.length > 0
        ? 'directory'
        : inferLeafType(expandedName, template.forcedFile);

      const node: RenderedRecipeNode = {
        id: `${template.id}:${relativePath}`,
        sourceNodeId: template.id,
        name: expandedName,
        relativePath,
        type,
        children: renderedChildren
      };

      renderedNodes.push(node);
      seenPaths.add(relativePath);

      for (const child of flattenRenderedNodes(renderedChildren)) {
        seenPaths.add(child.relativePath);
      }
    }
  }

  const siblingNames = new Set<string>();

  for (const node of renderedNodes) {
    if (siblingNames.has(node.name)) {
      throw new CookError(
        'DUPLICATE_SIBLING',
        `Recipe renders duplicate sibling names under "${parentPath || '.'}": "${node.name}".`
      );
    }

    siblingNames.add(node.name);
  }

  return renderedNodes;
}

function attachContentBlocks(
  recipe: RecipeTemplate,
  renderedRoots: RenderedRecipeNode[],
  bindings: Record<string, string>
): RenderedRecipeFile[] {
  const renderedNodes = flattenRenderedNodes(renderedRoots);
  const renderedFiles = renderedNodes.filter((node) => node.type === 'file');
  const filesByPath = new Map(renderedFiles.map((node) => [ node.relativePath, node ]));
  const filesByBaseName = new Map<string, RenderedRecipeNode[]>();
  const contentsByPath = new Map<string, string>();

  for (const fileNode of renderedFiles) {
    const baseName = path.posix.basename(fileNode.relativePath);
    const matches = filesByBaseName.get(baseName) ?? [];

    matches.push(fileNode);
    filesByBaseName.set(baseName, matches);
  }

  for (const block of recipe.contentBlocks) {
    const expandedHeaders = expandPathTemplate(block.header, bindings);

    for (const header of expandedHeaders) {
      const matchedFile = header.includes('/')
        ? filesByPath.get(header)
        : resolveRenderedFileByBaseName(filesByBaseName, header);

      if (!matchedFile) {
        const directoryMatch = renderedNodes.find((node) => node.relativePath === header && node.type === 'directory');

        if (directoryMatch) {
          throw new CookError('DIRECTORY_CONTENT_TARGET', `Content block "${header}" targets a directory.`);
        }

        throw new CookError('MISSING_CONTENT_TARGET', `Content block "${header}" does not match any file in the rendered recipe.`);
      }

      if (contentsByPath.has(matchedFile.relativePath)) {
        throw new CookError(
          'DUPLICATE_CONTENT_BLOCK',
          `Recipe renders more than one content block for "${matchedFile.relativePath}".`
        );
      }

      contentsByPath.set(matchedFile.relativePath, interpolateBodyTemplate(block.body, bindings));
    }
  }

  return renderedFiles.map((fileNode) => ({
    nodeId: fileNode.id,
    relativePath: fileNode.relativePath,
    content: contentsByPath.get(fileNode.relativePath) ?? ''
  }));
}

function resolveRenderedFileByBaseName(
  filesByBaseName: Map<string, RenderedRecipeNode[]>,
  header: string
): RenderedRecipeNode | undefined {
  const matches = filesByBaseName.get(header) ?? [];

  if (matches.length > 1) {
    throw new CookError(
      'AMBIGUOUS_CONTENT_TARGET',
      `Content block "${header}" is ambiguous after expansion. Use the full relative path instead.`
    );
  }

  return matches[0];
}

function inferLeafType(name: string, forcedFile: boolean): 'file' | 'directory' {
  if (forcedFile) {
    return 'file';
  }

  if (name.startsWith('.')) {
    return 'file';
  }

  if (name.includes('.')) {
    return 'file';
  }

  return 'directory';
}

function validateRenderedSegment(value: string, line: number): void {
  if (value === '' || value === '.' || value === '..') {
    throw new CookError('INVALID_RENDERED_PATH', `Line ${line} renders an invalid path segment "${value}".`);
  }

  if (value.includes('/') || value.includes('\\')) {
    throw new CookError(
      'INVALID_RENDERED_PATH',
      `Line ${line} renders "${value}", which spans multiple path segments.`
    );
  }

  if (path.isAbsolute(value) || value.startsWith('~/')) {
    throw new CookError(
      'INVALID_RENDERED_PATH',
      `Line ${line} renders an absolute path segment "${value}".`
    );
  }
}

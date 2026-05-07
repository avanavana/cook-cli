import path from 'node:path';

import type { RecipeNodeTemplate, RenderedRecipeNode } from './recipe-types.js';

export interface TemplatePathEntry {
  node: RecipeNodeTemplate;
  relativePath: string;
}

export function flattenTemplateNodes(nodes: RecipeNodeTemplate[]): RecipeNodeTemplate[] {
  const flattened: RecipeNodeTemplate[] = [];

  function visit(node: RecipeNodeTemplate): void {
    flattened.push(node);

    for (const child of node.children) {
      visit(child);
    }
  }

  for (const node of nodes) {
    visit(node);
  }

  return flattened;
}

export function flattenRenderedNodes(nodes: RenderedRecipeNode[]): RenderedRecipeNode[] {
  const flattened: RenderedRecipeNode[] = [];

  function visit(node: RenderedRecipeNode): void {
    flattened.push(node);

    for (const child of node.children) {
      visit(child);
    }
  }

  for (const node of nodes) {
    visit(node);
  }

  return flattened;
}

export function buildTemplatePathEntries(nodes: RecipeNodeTemplate[]): TemplatePathEntry[] {
  const entries: TemplatePathEntry[] = [];

  function visit(node: RecipeNodeTemplate, parentPath: string): void {
    const relativePath = parentPath === '' ? node.name : path.posix.join(parentPath, node.name);

    entries.push({
      node,
      relativePath
    });

    for (const child of node.children) {
      visit(child, relativePath);
    }
  }

  for (const node of nodes) {
    visit(node, '');
  }

  return entries;
}

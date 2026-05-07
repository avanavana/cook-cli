import path from 'node:path';

import type { ExecutionPlan, RenderedRecipeNode } from '../core/recipe-types.js';

export function renderTree(nodes: RenderedRecipeNode[]): string {
  const lines: string[] = [];

  function visit(node: RenderedRecipeNode, indentLevel: number): void {
    const suffix = node.type === 'directory' ? '/' : '';

    lines.push(`${'  '.repeat(indentLevel)}${node.name}${suffix}`);

    for (const child of node.children) {
      visit(child, indentLevel + 1);
    }
  }

  for (const node of nodes) {
    visit(node, 0);
  }

  return lines.join('\n');
}

export function formatExecutionPlan(plan: ExecutionPlan): string {
  const lines: string[] = [];

  lines.push('Tree');
  lines.push(plan.tree);
  lines.push('');
  lines.push('Variables');

  const bindingEntries = Object.entries(plan.bindings);

  if (bindingEntries.length === 0) {
    lines.push('  none');
  } else {
    for (const [ name, value ] of bindingEntries) {
      lines.push(`  ${name}=${JSON.stringify(value)}`);
    }
  }

  lines.push('');
  lines.push('Files');

  if (plan.files.length === 0) {
    lines.push('  none');
  } else {
    for (const file of plan.files) {
      lines.push(`  [${file.status}] ${file.relativePath}`);
    }
  }

  const overwriteConflicts = plan.files.filter((file) => file.status === 'conflict');

  if (overwriteConflicts.length > 0) {
    lines.push('');
    lines.push('Conflicts');

    for (const conflict of overwriteConflicts) {
      lines.push(`  ${path.normalize(conflict.absolutePath)}${conflict.reason ? `: ${conflict.reason}` : ''}`);
    }
  }

  return lines.join('\n');
}

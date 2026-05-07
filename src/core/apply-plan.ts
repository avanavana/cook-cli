import { mkdir, writeFile } from 'node:fs/promises';

import { CookError } from './cook-error.js';
import type { ExecutionPlan } from './recipe-types.js';

export async function applyPlan(plan: ExecutionPlan): Promise<void> {
  if (plan.conflicts.length > 0) {
    throw new CookError(
      'PLAN_CONFLICTS',
      'Execution plan contains conflicts. Re-run with --force, --no-clobber, or --merge as appropriate.'
    );
  }

  for (const directory of plan.directories) {
    if (directory.status === 'conflict') {
      continue;
    }

    await mkdir(directory.absolutePath, { recursive: true });
  }

  for (const file of plan.files) {
    if (file.status === 'skip' || file.status === 'conflict') {
      continue;
    }

    await writeFile(file.absolutePath, file.content, 'utf8');
  }
}

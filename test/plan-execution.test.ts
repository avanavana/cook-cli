import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseRecipe } from '../src/core/parse-recipe.js';
import { planExecution } from '../src/core/plan-execution.js';
import { renderRecipe } from '../src/core/render-recipe.js';

describe('planExecution', () => {
  it('generates a plan for a simple tree', async () => {
    const recipe = parseRecipe(`project\n  src\n  README.md`);
    const rendered = renderRecipe(recipe);
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'cook-plan-'));
    const plan = await planExecution(rendered, {
      outDirectory: tempDirectory,
      conflictStrategy: 'error'
    });

    expect(plan.directories.map((entry) => entry.relativePath)).toEqual([ 'project', 'project/src' ]);
    expect(plan.files.map((entry) => entry.relativePath)).toEqual([ 'project/README.md' ]);
  });

  it('reports overwrite conflicts during dry runs', async () => {
    const recipe = parseRecipe(`project\n  README.md`);
    const rendered = renderRecipe(recipe);
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'cook-conflict-'));

    await mkdir(path.join(tempDirectory, 'project'), { recursive: true });
    await writeFile(path.join(tempDirectory, 'project', 'README.md'), 'existing', 'utf8');

    const plan = await planExecution(rendered, {
      outDirectory: tempDirectory,
      conflictStrategy: 'error'
    });

    expect(plan.files[0]?.status).toBe('conflict');
    expect(plan.conflicts).toHaveLength(1);
  });

  it('skips existing files in no-clobber mode', async () => {
    const recipe = parseRecipe(`project\n  README.md`);
    const rendered = renderRecipe(recipe);
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'cook-skip-'));

    await mkdir(path.join(tempDirectory, 'project'), { recursive: true });
    await writeFile(path.join(tempDirectory, 'project', 'README.md'), 'existing', 'utf8');

    const plan = await planExecution(rendered, {
      outDirectory: tempDirectory,
      conflictStrategy: 'skip'
    });

    expect(plan.files[0]?.status).toBe('skip');
  });

  it('treats merge as skip behavior for existing files', async () => {
    const recipe = parseRecipe(`project\n  README.md`);
    const rendered = renderRecipe(recipe);
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'cook-merge-'));

    await mkdir(path.join(tempDirectory, 'project'), { recursive: true });
    await writeFile(path.join(tempDirectory, 'project', 'README.md'), 'existing', 'utf8');

    const plan = await planExecution(rendered, {
      outDirectory: tempDirectory,
      conflictStrategy: 'skip'
    });

    expect(plan.files[0]?.status).toBe('skip');
  });

  it('orders directories before files in the plan', async () => {
    const recipe = parseRecipe(`project\n  src\n    main.ts`);
    const rendered = renderRecipe(recipe);
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'cook-order-'));
    const plan = await planExecution(rendered, {
      outDirectory: tempDirectory,
      conflictStrategy: 'error'
    });

    expect(plan.directories.map((entry) => entry.relativePath)).toEqual([ 'project', 'project/src' ]);
    expect(plan.files[0]?.relativePath).toBe('project/src/main.ts');
  });
});

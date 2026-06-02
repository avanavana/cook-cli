import { describe, expect, it } from 'vitest';

import {
  buildRawReview,
  getNextVariableName,
  inspectRawRecipe
} from '../src/interactive/raw-session.js';

describe('raw session helpers', () => {
  it('inspects a valid recipe and discovers variables', () => {
    const inspection = inspectRawRecipe(`{{project}}\n  README.md`);

    expect(inspection.error).toBeUndefined();
    expect(inspection.variableNames).toEqual([ 'project' ]);
    expect(inspection.templateTree).toContain('{{project}}/');
  });

  it('reports parse errors during inspection', () => {
    const inspection = inspectRawRecipe(`project\n\nREADME.md`);

    expect(inspection.error).toBeDefined();
    expect(inspection.recipe).toBeUndefined();
  });

  it('finds the next missing variable in order', () => {
    const next = getNextVariableName([ 'project', 'app-name' ], { project: 'cook' });

    expect(next).toBe('app-name');
  });

  it('builds a review preview from the core engine', async () => {
    const review = await buildRawReview(`{{project}}\n  README.md`, { project: 'cook' }, process.cwd());

    expect(review.previewText).toContain('Tree');
    expect(review.previewText).toContain('cook/');
    expect(review.previewText).toContain('[create] cook/README.md');
  });
});

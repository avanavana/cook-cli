import { describe, expect, it } from 'vitest';

import { loadExpandedBindingSets } from '../src/core/resolve-variables.js';

describe('loadExpandedBindingSets', () => {
  it('supports repeated variable flags', async () => {
    const bindingSets = await loadExpandedBindingSets([ 'var1=hello', 'var2=world' ], undefined);

    expect(bindingSets).toEqual([ { var1: 'hello', var2: 'world' } ]);
  });

  it('expands variable values into multiple binding sets', async () => {
    const bindingSets = await loadExpandedBindingSets([ 'name=WI{{00..02}}' ], undefined);

    expect(bindingSets).toEqual([
      { name: 'WI00' },
      { name: 'WI01' },
      { name: 'WI02' }
    ]);
  });

  it('creates cartesian products across expanded variable flags', async () => {
    const bindingSets = await loadExpandedBindingSets([ 'name=WI{{00..01}}', 'kind={{raw,final}}' ], undefined);

    expect(bindingSets).toEqual([
      { name: 'WI00', kind: 'raw' },
      { name: 'WI00', kind: 'final' },
      { name: 'WI01', kind: 'raw' },
      { name: 'WI01', kind: 'final' }
    ]);
  });
});

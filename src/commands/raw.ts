import { Command } from 'commander';

import { runRawMode } from '../interactive/run-raw-mode.js';

export function createRawCommand(): Command {
  return new Command('raw')
    .description('Interactive recipe authoring mode')
    .addHelpText(
      'afterAll',
      `
Examples:
  cook raw
  cook -i
`
    )
    .action(async () => {
      await runRawMode();
    });
}

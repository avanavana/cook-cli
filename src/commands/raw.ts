import { Command } from 'commander';

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
      throw new Error('cook raw is scaffolded but not implemented yet. The core engine is being built first, per the spec.');
    });
}

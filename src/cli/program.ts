import { Command } from 'commander';

import { registerApplyCommand } from '../commands/apply.js';
import { createAddCommand } from '../commands/add.js';
import { createCloneCommand } from '../commands/clone.js';
import { createEditCommand } from '../commands/edit.js';
import { createListCommand } from '../commands/list.js';
import { createRawCommand } from '../commands/raw.js';
import { createShowCommand } from '../commands/show.js';
import { createTasteCommand } from '../commands/taste.js';
import { createValidateCommand } from '../commands/validate.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('cook')
    .description(
      [
        'CLI-first scaffolding from .rcp recipes',
        '',
        'Examples:',
        '  cook web-app my-app -o ~/Code',
        '  cook ./recipes/web-app.rcp --variable project=my-app -o ~/Code',
        '  cat quick.rcp | cook - --variable project=draft-project -o ~/Desktop',
        `  cook 'project / src README.md' -o ~/Desktop`,
        '  cook taste web-app my-app -o ~/Code',
        '  cook add scratch "project / notes todos.md"',
        '  cook clone ./existing-project imported-project'
      ].join('\n')
    )
    .version('0.1.0')
    .showHelpAfterError()
    .addHelpText(
      'afterAll',
      `
Examples:
  cook web-app my-app -o ~/Code
  cook ./recipes/web-app.rcp --variable project=my-app -o ~/Code
  cat quick.rcp | cook - --variable project=draft-project -o ~/Desktop
  cook 'project / src README.md' -o ~/Desktop
  cook taste web-app my-app -o ~/Code
  cook add scratch 'project / notes todos.md'
  cook clone ./existing-project imported-project
`
    );

  registerApplyCommand(program);
  program.addCommand(createTasteCommand());
  program.addCommand(createAddCommand());
  program.addCommand(createCloneCommand());
  program.addCommand(createListCommand());
  program.addCommand(createShowCommand());
  program.addCommand(createEditCommand());
  program.addCommand(createValidateCommand());
  program.addCommand(createRawCommand());

  return program;
}

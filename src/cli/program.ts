import { Command } from 'commander';

import { registerApplyCommand } from '../commands/apply.js';
import { createAddCommand } from '../commands/add.js';
import { createCloneCommand } from '../commands/clone.js';
import { createEditCommand } from '../commands/edit.js';
import { createListCommand } from '../commands/list.js';
import { createRawCommand } from '../commands/raw.js';
import { createRenameCommand } from '../commands/rename.js';
import { createShowCommand } from '../commands/show.js';
import { createTasteCommand } from '../commands/taste.js';
import { createValidateCommand } from '../commands/validate.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('cook')
    .enablePositionalOptions()
    .description(
      [
        'CLI-first scaffolding from .rcp recipes',
        '',
        'Examples:',
        '  cook web-app my-app -o ~/Code',
        '  cook ./recipes/web-app.rcp --variable project=my-app -o ~/Code',
        '  cat quick.rcp | cook - --variable project=draft-project -o ~/Desktop',
        `  cook 'project / src README.md' -o ~/Desktop`,
        `  cook 'project / src README.md' --save scratch -o ~/Desktop`,
        '  cook taste web-app my-app -o ~/Code',
        '  cook add scratch "project / notes todos.md"',
        '  cook rename example helloworld',
        '  cook clone ./existing-project imported-project'
      ].join('\n')
    )
    .version('1.3.0')
    .configureOutput({
      outputError: (message, write) => {
        const trimmedMessage = message.trimEnd();

        write(`${trimmedMessage}\nRun \`cook -h\` for usage guidance.\n`);
      }
    })
    .exitOverride()
    .addHelpText(
      'afterAll',
      `
Examples:
  cook web-app my-app -o ~/Code
  cook ./recipes/web-app.rcp --variable project=my-app -o ~/Code
  cat quick.rcp | cook - --variable project=draft-project -o ~/Desktop
  cook 'project / src README.md' -o ~/Desktop
  cook 'project / src README.md' --save scratch -o ~/Desktop
  cook taste web-app my-app -o ~/Code
  cook add scratch 'project / notes todos.md'
  cook rename example helloworld
  cook clone ./existing-project imported-project
`
    );

  registerApplyCommand(program);
  program.addCommand(createTasteCommand());
  program.addCommand(createAddCommand());
  program.addCommand(createCloneCommand());
  program.addCommand(createListCommand());
  program.addCommand(createShowCommand());
  program.addCommand(createRenameCommand());
  program.addCommand(createEditCommand());
  program.addCommand(createValidateCommand());
  program.addCommand(createRawCommand());

  return program;
}

import { describe, expect, it, vi } from 'vitest';

import { createProgram } from '../src/cli/program.js';
import { createTasteCommand } from '../src/commands/taste.js';
import { ensureRecipeNameAllowed } from '../src/config/recipe-store.js';

describe('CLI help', () => {
  it('includes top-level examples', () => {
    const help = createProgram().helpInformation();

    expect(help).toContain('cook taste');
    expect(help).toContain(`cook 'project / src README.md' -o ~/Desktop`);
    expect(help).toContain(`cook 'project / src README.md' --save scratch -o ~/Desktop`);
    expect(help).toContain('cook rename example helloworld');
    expect(help).toContain('cook clone ./existing-project imported-project');
  });

  it('includes taste examples', () => {
    const help = createTasteCommand().helpInformation();

    expect(help).toContain('cook taste web-app my-app -o ~/Code');
    expect(help).toContain('cook taste ./recipes/app.rcp --variable project=my-app');
  });

  it('prints a short hint instead of full usage after command errors', async () => {
    const writes: string[] = [];
    const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    try {
      await expect(createProgram().parseAsync([ 'node', 'cook', '--wat' ], { from: 'node' })).rejects.toMatchObject({
        code: 'commander.unknownOption'
      });
    } finally {
      stderrWriteSpy.mockRestore();
    }

    const stderr = writes.join('');

    expect(stderr).toContain(`error: unknown option '--wat'`);
    expect(stderr).toContain('Run `cook -h` for usage guidance.');
    expect(stderr).not.toContain('Usage:');
  });

  it('passes repeated subcommand options through the top-level parser', async () => {
    const writes: string[] = [];
    const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    try {
      await createProgram().parseAsync(
        [ 'node', 'cook', 'taste', '{{id}} README.md', '--var', 'id=WI{{00..01}}' ],
        { from: 'node' }
      );
    } finally {
      stdoutWriteSpy.mockRestore();
    }

    const stdout = writes.join('');

    expect(stdout).toContain('Dishes (2)');
    expect(stdout).toContain('id="WI00"');
    expect(stdout).toContain('id="WI01"');
  });
});

describe('recipe names', () => {
  it('rejects reserved subcommand names', () => {
    expect(() => ensureRecipeNameAllowed('add')).toThrowError();
    expect(() => ensureRecipeNameAllowed('rename')).toThrowError();
    expect(() => ensureRecipeNameAllowed('taste')).toThrowError();
  });
});

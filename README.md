# cook-cli

`cook` is a TypeScript CLI for scaffolding directories and files from lightweight `.rcp` recipes. It is designed to be fast for one-off filesystem work, but reusable enough to become part of a real team workflow.

The local product spec lives at `docs/cook-spec.md`. That directory is intentionally gitignored, so the checked-in README serves as the public-facing guide for the repository.

## Features

**Plain-text `.rcp` recipes**  
Recipes are indentation-first and easy to read in Git, code review, and the terminal. The format keeps structure in a contiguous outline and uses explicit file content blocks only where raw file bodies need reliable boundaries.

**Reusable variables**  
Recipes support `{{name}}` placeholders in node names, file headers, and file bodies. You can bind values with named flags, positional arguments, files on disk, or stdin for shell-friendly automation.

**Structural expansions**  
The language supports built-in structural expansion forms such as `{{0..4}}`, `{{0..10..2}}`, `{{a..d}}`, and `{{api,web,docs}}`. This keeps repeated scaffolding declarative without turning the recipe format into a programming language.

**Dry-run previews with `cook taste`**  
`cook taste` runs the same parse, bind, expansion, and planning pipeline as `cook`, but stops before any writes happen. It shows the rendered tree, the resolved bindings, the file plan, and overwrite conflicts so you can trust the result before applying it.

**Flexible recipe sources**  
You can apply saved recipes, filesystem paths, stdin recipes, or short inline structure expressions. That makes `cook` useful for both long-lived templates and quick shell-driven scaffolding.

**Saved recipe workflow**  
Recipes can be added to `~/.cook/recipes`, listed, shown, edited, validated, and cloned from existing directories. Reserved command words are blocked as saved recipe names to keep the CLI vocabulary consistent.

**Clone-to-recipe support**  
`cook clone` converts an existing directory tree into a reusable `.rcp` file. By default it captures structure and empty files, and it can optionally include file contents when you need a fuller starting point.

**Configurable editor integration**  
`cook edit` resolves editors in a predictable order: `COOK_EDITOR`, `~/.cook/config.toml`, `EDITOR`, then `vi`. That keeps recipe editing aligned with the rest of a developer’s terminal workflow.

## Status

The parser, renderer, planner, saved-recipe commands, inline-expression mode, and clone flow are implemented. `cook raw` is scaffolded as the future Ink-powered interactive mode, but the interactive UI itself is not implemented yet.

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- A POSIX-like shell for the examples in this README

## Installation

`cook-cli` is set up for source-based use today.

```bash
git clone https://github.com/avanavana/cook-cli.git
cd cook-cli
pnpm install
pnpm build
pnpm link --global
```

After linking, the `cook` binary is available globally:

```bash
cook --help
```

For local development without a global link, you can also run:

```bash
pnpm exec cook --help
```

## Usage

### Command summary

```text
cook <recipe> [args...] [options]
cook taste <recipe> [args...] [options]
cook add <name> [source]
cook clone <source-path> <recipe-name> [options]
cook list
cook show <name>
cook edit <name>
cook validate <recipe> [args...] [options]
cook raw
cook -i
```

### Global concepts

#### Recipe resolution

When you run `cook <recipe>` or `cook taste <recipe>`, the first argument is resolved in this order:

1. `-` means read the recipe itself from stdin.
2. If the value contains whitespace and is not an existing saved recipe or filesystem path, it is treated as an inline structure expression.
3. If it contains a `/`, starts with `.`, starts with `~`, or ends with `.rcp`, it is treated as a path.
4. Otherwise it is resolved as `~/.cook/recipes/<recipe>.rcp`.

#### Variable binding

Unbound variables are collected in first-appearance order across the recipe and then resolved from:

1. `--variable name=value`
2. `--var name=value`
3. `--variable name@path`
4. `--variable name@-`
5. Remaining positional arguments

#### Conflict flags

- `--force` allows overwriting existing files.
- `--no-clobber` skips files that already exist.
- `--merge` currently behaves like non-clobber mode and creates only missing entries without replacing existing file content.

### `cook`

Apply a recipe and write the planned filesystem changes to disk.

```bash
cook <recipe> [args...] [options]
```

Arguments:

- `<recipe>`: saved recipe name, `.rcp` path, `-`, or inline expression
- `[args...]`: positional values for any remaining unbound variables

Options:

- `-o, --out <path>`: destination parent directory
- `--force`: overwrite files without prompting
- `--no-clobber`: skip files that already exist
- `--merge`: create missing entries but never overwrite content
- `--variable <name=value>`: bind a variable explicitly or load it from `name@path` / `name@-`
- `--var <name=value>`: alias for `--variable`

### `cook taste`

Preview a recipe without writing to disk.

```bash
cook taste <recipe> [args...] [options]
```

Arguments:

- `<recipe>`: saved recipe name, `.rcp` path, `-`, or inline expression
- `[args...]`: positional values for any remaining unbound variables

Options:

- `-o, --out <path>`: destination parent directory used for conflict checks
- `--force`: preview the plan as if overwrites are allowed
- `--no-clobber`: preview skip behavior for existing files
- `--merge`: preview merge behavior for existing files
- `--variable <name=value>`: bind a variable explicitly or load it from `name@path` / `name@-`
- `--var <name=value>`: alias for `--variable`

Output includes:

- rendered tree
- resolved variable bindings
- file creation or overwrite status
- conflict locations when the destination already contains incompatible paths

### `cook add`

Save a recipe to `~/.cook/recipes/<name>.rcp`.

```bash
cook add <name> [source]
```

Arguments:

- `<name>`: saved recipe name
- `[source]`: recipe path, inline expression, or omit it and pipe the recipe via stdin

Behavior:

- existing recipe files can be imported directly
- inline expressions are normalized into standard multi-line `.rcp` format before they are saved
- reserved names such as `add`, `clone`, `list`, `raw`, `taste`, and `validate` are rejected

### `cook clone`

Clone an existing directory tree into a saved recipe.

```bash
cook clone <source-path> <recipe-name> [options]
```

Arguments:

- `<source-path>`: directory to inspect
- `<recipe-name>`: saved recipe name under `~/.cook/recipes`

Options:

- `--content`: include file bodies in the generated recipe

Defaults:

- `.DS_Store`, `node_modules`, and `.git` are ignored
- structure and empty files are cloned by default
- file contents are cloned only when `--content` is present

### `cook list`

List all saved recipes in `~/.cook/recipes`.

```bash
cook list
```

### `cook show`

Print a saved recipe to stdout.

```bash
cook show <name>
```

### `cook edit`

Open a saved recipe in your configured editor.

```bash
cook edit <name>
```

Editor resolution order:

1. `COOK_EDITOR`
2. `editor` in `~/.cook/config.toml`
3. `EDITOR`
4. `vi`

### `cook validate`

Validate a recipe and print a JSON summary of the resolved files and variables.

```bash
cook validate <recipe> [args...] [options]
```

Arguments:

- `<recipe>`: saved recipe name, `.rcp` path, `-`, or inline expression
- `[args...]`: positional values for any remaining unbound variables

Options:

- `--variable <name=value>`: bind a variable explicitly or load it from `name@path` / `name@-`
- `--var <name=value>`: alias for `--variable`

### `cook raw` / `cook -i`

Reserved for the future interactive authoring flow built with Ink.

```bash
cook raw
cook -i
```

Current behavior:

- the command exists
- it is intentionally routed separately from the rest of the CLI architecture
- it currently exits with a not-yet-implemented message while the interactive flow is still under construction

## Examples

### Apply a saved recipe

```bash
cook web-app my-app -o ~/Code
```

### Preview before writing

```bash
cook taste web-app my-app -o ~/Code
```

### Apply a recipe from a path

```bash
cook ./recipes/web-app.rcp --variable project=my-app -o ~/Code
```

### Pipe the recipe itself through stdin

```bash
cat quick.rcp | cook - --variable project=draft-project -o ~/Desktop
```

### Bind a variable from a file

```bash
cook web-app --variable project@./project-name.txt -o ~/Code
```

### Bind a variable from stdin

```bash
printf 'my-app' | cook web-app --variable project@- -o ~/Code
```

### Use positional variables

```bash
cook workspace my-monorepo dashboard
```

### Use an inline structure expression

```bash
cook 'project / src README.md' -o ~/Desktop
```

### Save an inline expression as a recipe

```bash
cook add scratch 'project / notes todos.md'
```

### Clone a directory into a recipe

```bash
cook clone ./existing-project imported-project
```

## Recipes

### `.rcp` structure

An `.rcp` file has two logical sections:

1. a contiguous structure outline at the top of the file
2. zero or more file content blocks after the first blank line

Structure rules:

- the outline starts on line 1
- blank lines are not allowed inside the outline
- tabs are invalid
- indentation defines parent-child relationships

Example:

````text
{{project}}
  src
    app
    components
    lib
  public
  README.md
  package.json
````

### Variables

Use `{{name}}` everywhere:

- in node names
- in file content block headers
- in file bodies

Example:

````text
{{project}}
  README.md

README.md
---
# {{project}}
Created by Cook.
````

### Structural expansions

Supported V1 expansion forms:

- `{{0..4}}`
- `{{0..10..2}}`
- `{{a..d}}`
- `{{api,web,docs}}`

Example:

````text
services
  {{api,web,docs}}
````

### File content blocks

Each content block uses:

1. a file path header
2. a line containing exactly `---`
3. a raw body

Example:

````text
src
  main.ts

src/main.ts
---
console.log('Hello from Cook');
````

### Inline expressions

Inline expressions are intentionally small and only describe structure. They do not support file bodies.

Control tokens:

- `/`: descend into the previously created directory
- `..`: move back up one level

Quoted names with spaces are supported:

```bash
cook '"My Project" / "reference docs" README.md'
```

### Saved recipe location

By default, Cook stores its local application data under `~/.cook`:

```text
~/.cook/
  recipes/
  config.toml
  history/
  cache/
```

## Development

Useful local commands:

```bash
pnpm install
pnpm check
pnpm test
pnpm lint
pnpm build
```

Branching and release workflow:

- day-to-day work should start from `dev`
- feature work should use conventional branch names such as `feat/parser-collisions` or `fix/clone-empty-files`
- pull requests should target `dev`
- releases happen by merging `dev` into `main`
- pushes to `main` trigger `semantic-release`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

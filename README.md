<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src=".github/logo.png" alt="lipsum-cli logo" width="280">
</p>

<h1 align="center"><code>cook</code> CLI</h1>
<!-- markdownlint-enable MD033 -->

`cook` is a TypeScript CLI for scaffolding directories and files from lightweight `.rcp` recipes. It is designed to be fast for one-off filesystem work, but reusable enough to become part of a real team workflow.

The local product spec lives at `docs/cook-spec.md`. That directory is intentionally gitignored, so the checked-in README serves as the public-facing guide for the repository.

## Features

**Describe once, recreate anywhere**  
Instead of manually creating the same folders and starter files over and over, Cook lets you describe the shape of a project in a small text file and apply it wherever you need it. It works just as well for codebases, writing workspaces, research folders, scratch projects, and team templates.

**Simple, clear templating language**  
Cook’s template format is built to be simple enough to read at a glance. You describe folders with indentation, attach file contents only where needed, and keep the whole thing easy to review in the terminal or in Git.

**One template, many possibilities**  
You can turn a single template into many different outputs by filling in placeholders like project names, package names, or environment labels. That makes it easy to reuse the same starting point for every new app, workspace, client project, or experiment without copying and editing files by hand.

**Repeat structures, not keystrokes**  
Cook can expand ranges and lists for you, so one line can create a whole set of related folders or files. This is especially useful for monorepos, repeated content pipelines, test fixtures, or any setup where you need the same pattern more than once.

**Cook where you work**  
Cook can run saved templates, local files, piped stdin input, or short inline expressions you type directly into the shell. That means it fits both long-lived reusable workflows and fast one-off moments when you just want to scaffold something immediately.

**Your personal scaffolding library**  
You can save templates, list them, show them, edit them, validate them, and reuse them across projects. Over time, Cook becomes a lightweight toolkit of your own proven project starters instead of a pile of copied folders.

**Capture existing patterns**  
If you already have a good structure on disk, `cook clone` can turn it into a template instead of making you rewrite it manually. That makes it easy to capture a working layout, share it with others, and standardize how new projects get started.

**Plays well with others**  
Cook is designed for people who already live in the command line. It works with editors, pipes, files, arguments, and shell scripting conventions, so it adds power without forcing you into a separate app or a heavy framework-specific generator.

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
npm i -g .
```

After the global install finishes, the `cook` binary is available globally:

```bash
cook --help
```

The install also creates:

- `~/.cook/`
- `~/.cook/recipes/`
- `~/.cook/recipes/reference.rcp`
- `~/.cook/config.toml`

The bundled `reference.rcp` and the default `config.toml` are created only if they do not already exist.

To inspect the bundled recipe reference after install:

```bash
cook show reference
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
2. If the value contains whitespace, is not an existing saved recipe or filesystem path, and uses standalone inline control tokens like `/` or `..`, it is treated as an inline recipe expression.
3. Otherwise, if it contains whitespace but does not look path-like, it is also treated as an inline recipe expression.
4. If it starts with `.`, starts with `~`, is absolute, ends with `.rcp`, or contains a path separator inside a token such as `folder/recipe.rcp`, it is treated as a path.
5. Otherwise it is resolved as `~/.cook/recipes/<recipe>.rcp`.

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

- `<recipe>`: saved recipe name, `.rcp` path, `-`, or inline recipe expression
- `[args...]`: positional values for any remaining unbound variables

Options:

- `-o, --out <path>`: destination parent directory
- `--force`: overwrite files without prompting
- `--no-clobber`: skip files that already exist
- `--merge`: create missing entries but never overwrite content
- `--variable <name=value>`: bind a variable explicitly or load it from `name@path` / `name@-`; repeat the option to bind multiple variables
- `--var <name=value>`: alias for `--variable`; expanded values such as `name=WI{{00..09}}` fan out into multiple full recipe runs

### `cook taste`

Preview a recipe without writing to disk.

```bash
cook taste <recipe> [args...] [options]
```

Arguments:

- `<recipe>`: saved recipe name, `.rcp` path, `-`, or inline recipe expression
- `[args...]`: positional values for any remaining unbound variables

Options:

- `-o, --out <path>`: destination parent directory used for conflict checks
- `--force`: preview the plan as if overwrites are allowed
- `--no-clobber`: preview skip behavior for existing files
- `--merge`: preview merge behavior for existing files
- `--variable <name=value>`: bind a variable explicitly or load it from `name@path` / `name@-`; repeat the option to bind multiple variables
- `--var <name=value>`: alias for `--variable`; expanded values such as `name=WI{{00..09}}` fan out into multiple full recipe previews

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
- `[source]`: recipe path, inline recipe expression, or omit it and pipe the recipe via stdin

Behavior:

- existing recipe files can be imported directly
- inline recipe expressions are normalized into standard multi-line `.rcp` format before they are saved
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

- `<recipe>`: saved recipe name, `.rcp` path, `-`, or inline recipe expression
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

### Bind multiple variables

```bash
cook somerecipe --var var1=hello --var var2=world
```

### Fan out one recipe into multiple dishes

```bash
cook someotherrecipe --var name=WI{{00..09}}
```

### Use positional variables

```bash
cook workspace my-monorepo dashboard
```

### Use an inline recipe expression

```bash
cook 'project / src README.md' -o ~/Desktop
```

This creates:

```text
project/
  src/
  README.md
```

### Save an inline recipe expression as a recipe

```bash
cook add scratch 'project / notes todos.md'
```

### Clone a directory into a recipe

```bash
cook clone ./existing-project imported-project
```

## Recipes

Cook installs a bundled recipe reference at `~/.cook/recipes/reference.rcp`. The rest of this section documents the same language in README form, from the common rules to the rarer ones.

### Comments

Standalone lines that begin with `#` are ignored by the parser.

- comments are allowed before the structure outline
- comments are allowed inside the outline
- comments are allowed between content blocks
- raw file bodies are not parsed for comments, so Markdown headings such as `# Hello` stay intact

Example:

````text
# This is a comment.
# So is this.

project
  README.md
````

### Structure outline

Every recipe starts with a structure outline. Each non-comment line in the outline defines exactly one path segment.

Rules:

- indentation defines parent-child relationships
- blank lines end the outline and begin the content-block section
- tabs are invalid
- `/` is not allowed in structure lines
- absolute paths are invalid
- multiple top-level entries are allowed

Example:

````text
workspace
  apps
    web
    api
  docs
README.md
````

### File and directory inference

Cook infers what each leaf entry means:

- entries with children are directories
- leaf entries containing `.` are files
- dotfiles such as `.gitignore` are files
- extensionless leaf entries such as `Dockerfile` are treated as directories unless a content block targets them

That last rule lets recipes support filenames like `Dockerfile` and `Makefile` without needing extra syntax.

Example:

````text
project
  Dockerfile

Dockerfile
---
FROM node:22
````

### File content blocks

After the first blank line following the outline, you can attach file bodies.

Each content block has:

1. a file header
2. a separator line containing exactly `---`
3. a raw body

Example:

````text
src
  main.ts

src/main.ts
---
console.log('Hello from Cook');
````

Notes:

- the header can be just a filename like `README.md` when it is unique in the outline
- if the same filename appears more than once, use the full relative path such as `packages/api/README.md`
- content bodies are stored raw and can contain Markdown, JSON, shell scripts, and other text without extra escaping

### Variables

Use `{{name}}` placeholders when you want the same recipe to render differently each time.

Variables can appear:

- in structure node names
- in content block headers
- in file bodies

Variable names:

- must start with a letter or `_`
- can then use letters, numbers, `_`, and `-`

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

Cook also supports structural expansions for repeated directory or file patterns.

Supported forms:

- `{{api,web,docs}}`
- `{{1..3}}`
- `{{0..10..2}}`
- `{{a..c}}`

Expansions work in:

- structure node names
- content block headers

Example:

````text
packages
  {{api,web,docs}}
    README.md
docs
  section-{{a..c}}.md
snapshots
  run-{{1..3}}
````

Notes:

- expansions are inclusive
- descending numeric ranges need an explicit negative step, such as `{{5..1..-1}}`
- expansions are for paths and headers, not file-body interpolation
- file bodies only interpolate named variables such as `{{project}}`

### Ambiguous filenames

Content block headers can target a file by basename or by full relative path.

Use the basename when it is unique:

````text
project
  README.md

README.md
---
Root file
````

Use the full relative path when the basename appears more than once:

````text
project
  README.md
  packages
    api
      README.md

packages/api/README.md
---
API package docs
````

### Inline recipe expressions

Inline recipe expressions are a shortcut for small structure-only recipes passed directly on the command line. They do not support content blocks or comments.

Control tokens:

- `/`: descend into the previously created directory
- `..`: move back up one level

Quoted names with spaces are supported:

```bash
cook '"My Project" / "reference docs" README.md'
```

This creates:

```text
My Project/
  reference docs/
  README.md
```

### Saved recipe location

Cook stores its local application data under `~/.cook`:

```text
~/.cook/
  recipes/
    reference.rcp
  config.toml
```

Useful `config.toml` keys:

- `editor = "code --wait"`: choose the editor used by `cook edit`
- `max_dishes = 500`: cap how many expanded dishes a single command may create
- `max_rendered_paths = 50000`: cap the total rendered paths across all expanded dishes

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

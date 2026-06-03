# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The last published release was `1.0.0`, which corresponds to commit `24fe421`.
Versions `1.1.0` through `1.3.0` below capture the milestone work completed after that release.
Taken together, the current branch aligns with a `1.3.0` release.

## [1.3.0] - 2026-06-03

### Added

- `cook rename <current-name> <next-name>` for renaming saved recipes without leaving the CLI.
- `--save <name>` on `cook` to save the resolved recipe into `~/.cook/recipes/<name>.rcp` while applying it.

### Changed

- Rename the bundled starter recipe from `reference` to `example` and refresh it as the default working sample installed with Cook.

### Fixed

- Preserve `--variable` and `--var` option handling on subcommands so recipe bindings stay available throughout the CLI.

## [1.2.0] - 2026-06-03

### Added

- Install-time bootstrapping for `~/.cook/`, `~/.cook/recipes/`, a default `config.toml`, and a bundled starter recipe.
- A bundled recipe reference that doubles as a working example and syntax guide for `.rcp` files.
- Expanded variable bindings for `--variable` and `--var`, allowing one command to fan out into multiple rendered dishes.
- Guardrails for large expansions through configurable `max_dishes` and `max_rendered_paths` limits.

### Fixed

- Detect slash-based inline recipes more reliably so path-like input resolves to the correct recipe source.
- Explain expansion limit failures with clearer messages about whether the dish count or rendered path count exceeded the configured limit.
- Shorten CLI error output and always point users back to `cook -h` for follow-up guidance.

## [1.1.0] - 2026-06-02

### Added

- Interactive raw mode via `cook raw` and `cook -i` for composing recipes directly in the terminal.
- A guided terminal flow for inspecting recipe structure, stepping through variable bindings, previewing the execution plan, and optionally saving or applying the result.

## [1.0.0] - 2026-05-07

### Added

- First public release of `cook`, a TypeScript CLI for scaffolding directories and files from lightweight `.rcp` recipes.
- `cook` and `cook taste` for applying or previewing recipes from saved names, filesystem paths, stdin, or inline expressions.
- Saved recipe management commands including `cook add`, `cook clone`, `cook list`, `cook show`, and `cook edit`.
- `cook validate` for validating rendered recipe output and variable resolution without writing files.
- Variable interpolation, positional and named bindings, and inline list or range expansion for reusable recipes.
- Conflict handling through `--force`, `--no-clobber`, and `--merge`.

[1.3.0]: https://github.com/avanavana/cook-cli/compare/cc73b2ded8e6ef6142679fa8365e00ce650df042...e51b7c232896a41cda4a6c05df0de7419fd9dd6d
[1.2.0]: https://github.com/avanavana/cook-cli/compare/6e94b1519607a2890eea57d0484eefb8c6b68256...cc73b2ded8e6ef6142679fa8365e00ce650df042
[1.1.0]: https://github.com/avanavana/cook-cli/compare/24fe4216a7eec413057c88dbe87690517cfe8b2a...6e94b1519607a2890eea57d0484eefb8c6b68256
[1.0.0]: https://github.com/avanavana/cook-cli/commit/24fe4216a7eec413057c88dbe87690517cfe8b2a

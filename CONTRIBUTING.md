# Contributing

## Branch strategy

- `main` is release-only
- `dev` is the integration branch for reviewed work
- feature branches should start from `dev`
- feature branches should use conventional names such as `feat/readme-and-release`, `fix/path-resolution`, `docs/recipe-guide`, or `chore/github-bootstrap`

## Commit strategy

Use conventional commits for every commit:

- `feat: add inline recipe parsing`
- `fix: reject duplicate rendered paths`
- `docs: document recipe variables`
- `ci: add semantic-release workflow`

Keep commits atomic and focused.

## Pull requests

1. Branch from `dev`.
2. Make focused commits.
3. Run `pnpm check` and `pnpm test`.
4. Push your branch.
5. Open a PR into `dev`.

PRs should explain:

- what changed
- why it changed
- validation performed
- any follow-up work that remains

## Releases

- merge reviewed work from feature branches into `dev`
- when `dev` is ready, merge `dev` into `main`
- a push to `main` runs `semantic-release`
- semantic-release generates release notes, updates `CHANGELOG.md`, and publishes a GitHub Release

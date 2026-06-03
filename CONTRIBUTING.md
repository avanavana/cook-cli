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
- when `dev` is ready, open and review a PR from `dev` into `main`
- merging that PR into `main` runs the release workflow
- the release workflow verifies the project, creates a tag from `package.json`, and publishes a GitHub Release using the matching `CHANGELOG.md` entry

## Post-release sync

Because releases are cut from `main`, that branch can still move ahead of `dev` through merge commits and release tags.

After each release completes:

1. update your local refs
2. merge `main` back into `dev`
3. push the updated `dev` branch

Recommended commands:

```bash
git checkout main
git pull origin main

git checkout dev
git pull origin dev
git merge origin/main
git push origin dev
```

New feature branches should always start from the updated `dev` branch after this sync step.

# jsfitsio CI/CD

`jsfitsio` is a public npm package distributed under the Apache License 2.0.

The source repository remains on GitHub and the package is published to the
public npm registry:

```text
https://registry.npmjs.org/
```

## Branch policy

- `main` is the stable branch.
- Use short-lived feature branches for changes.
- Merge to `main` only after CI passes.
- Releases are created from `main` using version tags.

## CI

The CI workflow runs on pushes and pull requests.

Minimum checks:

```bash
npm ci
npm test
npm run prod
```

## Versioning

Use npm to update the package version:

```bash
npm version patch
npm version minor
npm version major
```

This updates:

- `package.json`
- `package-lock.json`

It also creates a git commit and a git tag such as:

```text
v2.1.0
```

The release tag must match the version in `package.json`.

## Release flow

From a clean `main` branch:

```bash
npm test
npm run prod
npm pack --dry-run
npm version patch
git push --follow-tags
```

Use `minor` or `major` instead of `patch` when appropriate.

## Automated npm publish

Publishing is handled by GitHub Actions and is triggered only by tags matching:

```text
v*
```

The release workflow:

1. installs dependencies with `npm ci`
2. verifies that the tag matches `package.json` version
3. runs tests
4. builds production outputs
5. checks package contents with `npm pack --dry-run`
6. verifies npm authentication with `npm whoami`
7. publishes to npmjs with provenance

## npm authentication

Manual local publishing requires an authenticated npm session:

```bash
npm whoami
```

If the command fails:

```bash
npm login
```

Automated publishing uses the GitHub repository secret:

```text
NPM_TOKEN
```

The token is exposed to npm commands as:

```text
NODE_AUTH_TOKEN
```

The token should be dedicated to this repository/package, should have no
organization access unless needed, and should have an expiration date.

## Important note about tags

GitHub Actions evaluates workflows from the commit pointed to by the pushed tag.

If a tag is created before `.github/workflows/release.yml` exists on that
commit, pushing that tag will not run the release workflow. In that case, either
publish manually after local verification or create a new version/tag after the
release workflow has been merged to `main`.

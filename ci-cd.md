# jsfitsio CI/CD

`jsfitsio` is a public npm package distributed under the Apache License 2.0.

The source repository is hosted on GitHub and public releases are published to npmjs.com.

## Current release policy

- publish the package as `jsfitsio`
- publish public releases to npmjs.com
- keep `dev` as the integration branch
- create feature branches from `dev`
- prepare final package versions on `release/<version>` branches
- merge release branches to `main` only after CI passes
- tag releases from `main` with `v<version>`
- publish only from a release tag
- use GitHub Actions Trusted Publishing via OIDC
- do not use long-lived `NPM_TOKEN` or `NODE_AUTH_TOKEN` credentials for publishing
- use CI success, `npm test`, production build, and `npm pack --dry-run` as release gates
- keep `package.json` and `package-lock.json` versions aligned
- after each release, merge `main` back into `dev` before starting the next snapshot version

## CI

GitHub Actions runs CI on pushes and pull requests.

The CI workflow should:

- check out the repository
- set up Node.js
- install dependencies with `npm ci`
- run the test suite with `npm test`
- create the production build
- verify npm package contents with `npm pack --dry-run`

The minimum deterministic CI checks are:

```bash
npm ci
npm test
npm run prod
npm pack --dry-run
```

The CI workflow is defined in:

```text
.github/workflows/ci.yml
```

A successful CI run is required before merging release branches to `main`.

## Development flow

Development happens on `dev`.

Start a feature branch from an up-to-date `dev` branch:

```bash
git checkout dev
git pull --ff-only origin dev

git checkout -b feature/<name>
```

During development, use snapshot versions, for example:

```json
"version": "2.1.2-snapshot"
```

After development and CI validation, merge the feature branch back into `dev`.

## Release flow

The following example describes release `2.1.2`.

Start from an up-to-date `dev` branch:

```bash
git checkout dev
git pull --ff-only origin dev
```

Optionally run the complete local validation before creating the release branch:

```bash
npm ci
npm test
npm run prod
npm pack --dry-run
```

Create the release branch:

```bash
git checkout -b release/2.1.2
```

Set the final package version without creating a Git tag:

```bash
npm version 2.1.2 --no-git-tag-version
```

Run the deterministic release gates:

```bash
npm ci
npm test
npm run prod
npm pack --dry-run
```

Review the changes:

```bash
git status
git diff
```

Commit the release preparation:

```bash
git add package.json package-lock.json
git commit -m "Prepare release 2.1.2"
git push -u origin release/2.1.2
```

Include any release-specific source, documentation, license, CI, or workflow changes in the release branch when required.

Open a pull request:

```text
release/2.1.2 -> main
```

Merge only after CI passes and the release content has been reviewed.

## Tag and publish

After the release pull request is merged:

```bash
git checkout main
git pull --ff-only origin main
```

Verify the version:

```bash
node -p "require('./package.json').version"
```

Optionally repeat the deterministic release gates locally:

```bash
npm ci
npm test
npm run prod
npm pack --dry-run
```

Create the release tag:

```bash
git tag -a v2.1.2 -m "Release v2.1.2"
git push origin v2.1.2
```

Pushing the tag triggers:

```text
.github/workflows/release.yml
```

The release workflow:

- checks out the tagged repository state
- configures Node.js
- configures npmjs.com as the package registry
- verifies that the Git tag matches the version in `package.json`
- installs dependencies with `npm ci`
- runs the tests
- creates the production build
- verifies package contents with `npm pack --dry-run`
- publishes `jsfitsio` to npmjs.com

Publishing uses npm Trusted Publishing with GitHub Actions OIDC.

No long-lived npm publishing token is required.

## Verify published package

Check the currently published version:

```bash
npm view jsfitsio version
```

Inspect package metadata:

```bash
npm info jsfitsio
```

Verify a specific release:

```bash
npm view jsfitsio@2.1.2
```

## Clean package installation test

A release should also be tested as an installed npm package rather than only from the repository checkout.

Create a temporary directory:

```bash
rm -rf /tmp/jsfitsio-test
mkdir /tmp/jsfitsio-test
cd /tmp/jsfitsio-test
npm init -y
```

Install the published package:

```bash
npm install jsfitsio@2.1.2
```

Verify the installed package version:

```bash
node -e "console.log(require('jsfitsio/package.json').version)"
```

Verify the ESM entry point:

```bash
node --input-type=module -e "import('jsfitsio').then(() => console.log('jsfitsio ESM import OK'))"
```

Verify the CommonJS entry point:

```bash
node -e "require('jsfitsio'); console.log('jsfitsio CommonJS require OK')"
```

This installation test is especially important because `jsfitsio` publishes separate ESM and CommonJS entry points.

## Start the next development cycle

After the release is published, synchronize `dev` with the released state on `main`.

Update `main`:

```bash
git checkout main
git pull --ff-only origin main
```

Update `dev`:

```bash
git checkout dev
git pull --ff-only origin dev
```

Merge the released state back into `dev`:

```bash
git merge main
git push origin dev
```

Start the next snapshot version:

```bash
npm version 2.1.3-snapshot --no-git-tag-version
```

Review the changes:

```bash
git diff
```

Commit and push:

```bash
git add package.json package-lock.json
git commit -m "Start 2.1.3 development"
git push origin dev
```

The resulting branch state should be:

```text
main
└── 2.1.2

dev
└── 2.1.3-snapshot
```

## Release pipeline summary

```text
feature/*
    │
    ▼
   dev
2.1.2-snapshot
    │
    ▼
release/2.1.2
    │
    │ version -> 2.1.2
    │ npm test
    │ npm run prod
    │ npm pack --dry-run
    ▼
   PR
    │
    │ CI passes
    ▼
  main
  2.1.2
    │
    ▼
tag v2.1.2
    │
    ▼
release.yml
    │
    ├── npm ci
    ├── npm test
    ├── npm run prod
    ├── npm pack --dry-run
    └── OIDC / Trusted Publishing
    │
    ▼
 npmjs.com
jsfitsio@2.1.2
    │
    ▼
merge main -> dev
    │
    ▼
   dev
2.1.3-snapshot
```
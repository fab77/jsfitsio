# jsfitsio Release Notes

This repository is part of the AstroViewer dependency family and now follows a
dual-license model.

Before a commercial-facing release is considered final, review:

- `LICENSE.md`
- `LICENSE-COMMERCIAL.md`
- `LICENSE-NONCOMMERCIAL.md`

## Current release policy

- keep the current package name `jsfitsio` until the package-channel strategy
  is finalized across the full dependency family
- tag releases from `main` with `v<version>`
- use CI build success as the minimum release gate

## Suggested release flow

```bash
npm ci
npm test
npm run prod
npm pack --dry-run
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin v2.0.0
```

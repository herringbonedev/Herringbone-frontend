# Herringbone Candidate Release Drop-in

This drop-in creates an Operations Center candidate release on push to main.

Generated artifacts use the same short SHA:

- Docker image: `quay.io/herringbone/operations-center:<short_sha>`
- NPM package: `@herringbonedev/operations-center@0.4.0-alpha.<short_sha>`

## Important token split

The workflow uses:

- `secrets.HERRINGBONE_ACTIONS_BOT` for checkout, pushing release branches, and opening PRs.
- `${{ github.token }}` for `npm publish` to GitHub Packages.

The workflow requires:

```yaml
permissions:
  contents: write
  pull-requests: write
  packages: write
  checks: write
  id-token: write
```

## Package access

If publishing still fails with E403, open the package settings for:

`@herringbonedev/operations-center`

Then add repository Actions access for the repository running the workflow, for example:

`Herringbone-frontend` with Write access.

## Files included

```text
.github/workflows/operations-center.yml
.github/workflows/candidate-release.yml
.github/actions/setup-release-env/action.yml
.github/actions/candidate-metadata/action.yml
.github/actions/npm-candidate-package/action.yml
.github/actions/docker-build-push-sign/action.yml
.github/actions/update-candidate-manifests/action.yml
.github/actions/create-candidate-pr/action.yml
.github/actions/docker-cleanup/action.yml
```

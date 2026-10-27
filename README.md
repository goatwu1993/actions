# GitHub Actions

A monorepo of GitHub Actions managed with npm workspaces. Each action lives in a top-level directory with its own README and `action.yml`, following the layout of [Homebrew/actions](https://github.com/Homebrew/actions).

| Action | Description |
| --- | --- |
| [Coverage action](coverage-action) | Report Cobertura coverage in pull requests and checks. |

## Usage

```yaml
- uses: goatwu1993/actions/coverage-action@main
  with:
    path: coverage/cobertura-coverage.xml
    minimum_coverage: 75
```

## Testing the local action

The `Test` workflow checks out the repository, runs tests with Istanbul coverage, and uploads the Cobertura report. For same-repository pull requests, its reporting job downloads that report and runs `./coverage-action` to publish the coverage comment and check. Fork and Dependabot pull requests use the separate `Coverage report` workflow, which runs from the default branch.

## Development

Requires Node.js 24 or newer. TypeScript, Vitest, Oxlint, and Rolldown are shared at the root, with one `package-lock.json` for all workspaces.

```sh
make
```

`make` runs dependency installation, tests, then the build, in order (including with `make -j`). The install step compares `package-lock.json` with the gitignored `.npm-ci-lock` copy from the last successful `npm ci --ignore-scripts`. It reinstalls when they differ or `node_modules` is missing. Tests and builds run every time.

`make test` uses the Vitest Istanbul coverage plugin and writes both `coverage-action/coverage/cobertura-coverage.xml` and `coverage-action/coverage/index.html`.

Run additional checks with:

```sh
npm run typecheck
npm run lint
```

To run a command for one action:

```sh
npm test --workspace coverage-action
npm run build --workspace coverage-action
```

Each action owns its `action.yml`, source, tests, runtime dependencies, and committed `dist/` bundle. GitHub runs bundles without installing dependencies.

## Adding an action

Create `<name>-action/` (automatically matched by the `*-action` workspace pattern) with a private `package.json`, `action.yml`, and source. Use a unique package name and add `test` and `build` scripts so root commands include it automatically. Extend the root `tsconfig.json` and set local `include` paths. Reuse the coverage action's build and test configuration as a starting point.

Install runtime dependencies in the action workspace:

```sh
npm install <dependency> --workspace <name>-action
```

Install shared development tools with `npm install --save-dev <tool>` at the root. Run `npm install` after adding a workspace and commit the root lockfile. Rebuild and commit each action's bundle before pushing.

Dependabot checks the root npm workspace and GitHub workflow dependencies weekly, grouping updates by ecosystem.

## License

[MIT](LICENSE).

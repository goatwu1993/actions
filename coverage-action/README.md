# Coverage action

![](https://github.com/goatwu1993/actions/workflows/Test/badge.svg)

GitHub Action which parse a [XML cobertura report](http://cobertura.github.io/cobertura/) and display the metrics in a GitHub Pull Request.

Many coverage tools can be configured to output cobertura reports:

* [coverage.py](https://coverage.readthedocs.io/en/latest/cmd.html#xml-reporting)
* [Istanbul](https://istanbul.js.org/docs/advanced/alternative-reporters/#cobertura)
* [Maven](https://www.mojohaus.org/cobertura-maven-plugin/)
* [simplecov](https://github.com/colszowka/simplecov/blob/master/doc/alternate-formatters.md#simplecov-cobertura)

This action needs write permissions for pull request comments and checks. GitHub restricts those permissions for pull requests from forks, so coverage cannot be posted to the pull request in that case.


## How it looks like

A comment is added to the pull request with the coverage report.


A check is added to the workflow run.


The check will succeed or fail based on your threshold when `fail_below_threshold` is set to `true`, this allows you to mandate coverage checks pass on your [protected branches](https://docs.github.com/en/github/administering-a-repository/defining-the-mergeability-of-pull-requests/about-protected-branches).

## Inputs

### `repo_token`

The GITHUB_TOKEN. Defaults to `${{github.token}}`

### `path`

The path to the cobertura report. Defaults to `coverage.xml`. Glob pattern is supported, for example `coverage/*.xml`.

### `skip_covered`

If files with 100% coverage should be ignored. Defaults to `true`.

### `minimum_coverage`

The minimum allowed coverage percentage as an integer.

### `fail_below_threshold`

Fail the action when the minimum coverage was not met.

### `show_line`

Show line rate as specific column.

### `show_branch`

Show branch rate as specific column.

### `show_class_names`

Show class names instead of file names.

### `show_missing`

Show line numbers of statements, per module, that weren't executed.

### `show_missing_max_length`

Crop missing line numbers strings that exceeds this length, provided as an integer.

Default is no crop.

(Note: "&hellip;" is appended to a cropped string)

### `link_missing_lines`

Link missing line numbers. This only has an effect when `show_missing` is set to `true`.
Defaults to `false`.

### `link_missing_lines_source_dir`

Allows specifying a source directory for `link_missing_lines`, that will be inserted
into the resulting URLs, in-between the commit hash and the file path.

### `only_changed_files`

Only show coverage for changed files.

### `report_name`

Use a unique name for the report and comment.

### `pull_request_number` **Optional**

Pull request number associated with the report. This property should be used when workflow trigger is different than `pull_request`.

If no pull request can determine the action will skip adding the comment.

## Example usage

```yaml
on:
  pull_request:
    types: [opened]
    branches:
      - master
jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: goatwu1993/actions/coverage-action@main
        with:
          path: src/test.xml
          minimum_coverage: 75
```

## Development

Run commands from the repository root (Node.js 24 or newer):

- Install dependencies: `npm ci --ignore-scripts`
- Run tests from the repository root: `npm test`
- Check this action's types: `npm run typecheck --workspace coverage-action`
- Build this action: `npm run build --workspace coverage-action`
- Lint all actions: `npm run lint`

Commit `dist/index.js` after rebuilding. GitHub runs this bundle directly.

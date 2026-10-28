import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";

let mockAgent: MockAgent;
let apiMock: ReturnType<MockAgent["get"]>;
const owner = "someowner";
const repo = "somerepo";
const dummyReport: import("../src/cobertura").CoverageReport = {
  total: 77.5,
  line: 77.5,
  branch: 0,
  files: [
    {
      name: "ClassFoo",
      filename: "__init__.py",
      total: 80,
      line: 80,
      branch: 0,
      missing: [{ start: 24, end: 26 }],
    },
    {
      name: "ClassBar",
      filename: "bar.py",
      total: 75,
      line: 80,
      branch: 0,
      missing: [
        { start: 23, end: 24 },
        { start: 39, end: 40 },
        { start: 50, end: 50 },
      ],
    },
    {
      name: "ClassMoo",
      filename: "foo.py",
      total: 75,
      line: 100,
      branch: 75,
      missing: [],
    },
  ],
};

beforeEach(() => {
  mockAgent = new MockAgent({ connections: 1 });
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
  apiMock = mockAgent.get("https://api.github.com");
  process.env["INPUT_REPO_TOKEN"] = "hunter2";
  process.env["GITHUB_REPOSITORY"] = `${owner}/${repo}`;
  process.exitCode = 0;
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
});

afterEach(async () => {
  mockAgent.assertNoPendingInterceptors();
  await mockAgent.close();
  vi.restoreAllMocks();
});

test("action", async () => {
  const { action } = await import("../src/action");
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "100";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_SHOW_MISSING"] = "false";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "false";
  process.env["INPUT_PULL_REQUEST_NUMBER"] = "";
  const prNumber = 1;
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);

  await action({
    pull_request: { number: prNumber, head: { sha: "deadbeef" } },
  });
  await action();
  mockAgent.assertNoPendingInterceptors();
});

test("action triggered by workflow event", async () => {
  const { action } = await import("../src/action");
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "100";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "false";
  process.env["INPUT_PULL_REQUEST_NUMBER"] = "";
  process.env["INPUT_SHOW_MISSING"] = "false";
  const prNumber = 1;
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/pulls?state=open`,
    })
    .reply(200, [{ number: 1, head: { sha: "deadbeef" } }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);
  await action({
    workflow_run: { head_commit: { id: "deadbeef" } },
  });
  mockAgent.assertNoPendingInterceptors();
});

test("action triggered by push", async () => {
  const { action } = await import("../src/action");
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "100";
  process.env["INPUT_FAIL_BELOW_THRESHOLD"] = "true";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "false";
  process.env["INPUT_SHOW_MISSING"] = "false";

  const body = {
    name: "coverage",
    head_sha: "deadbeef",
    status: "completed",
    conclusion: "failure",
    output: {
      title: "coverage",
      summary:
        '## Coverage Report\n\n| File | Coverage |   |\n| - | :-: | :-: |\n| **All files** | `82%` | :x: |\n| **Package: search** | `79%` | :x: |\n| search/BinarySearch.java | `87%` | :x: |\n| search/LinearSearch.java | `69%` | :x: |\n\n_Minimum allowed coverage is `100%`_\n\n> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef',
    },
  };
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/check-runs`,
      body: JSON.stringify(body),
    })
    .reply(200);
  await action({
    after: "deadbeef",
  });
  mockAgent.assertNoPendingInterceptors();
});

test("action passing pull request number directly", async () => {
  const { action } = await import("../src/action");
  const prNumber = 123;
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "100";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_SHOW_MISSING"] = "false";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "false";
  process.env["INPUT_PULL_REQUEST_NUMBER"] = String(prNumber);
  process.env["INPUT_SHOW_MISSING"] = "false";
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/pulls/${prNumber}`,
    })
    .reply(
      200,
      { head: { sha: "deadbeef" } },
      { headers: { "content-type": "application/json" } },
    );
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);
  await action({
    push: { ref: "master" },
  });
  mockAgent.assertNoPendingInterceptors();
});

test("action only changes", async () => {
  const { action } = await import("../src/action");
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "100";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_SHOW_MISSING"] = "false";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "true";
  process.env["INPUT_PULL_REQUEST_NUMBER"] = "";
  const prNumber = 1;
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    })
    .reply(200, [{ filename: "file1.txt" }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);

  await action({
    pull_request: { number: prNumber, head: { sha: "deadbeef" } },
  });
  await action();
  mockAgent.assertNoPendingInterceptors();
});

test("action with report name", async () => {
  const { action } = await import("../src/action");
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "100";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_SHOW_MISSING"] = "false";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "true";
  process.env["INPUT_REPORT_NAME"] = "Test Report";
  const prNumber = 1;
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    })
    .reply(200, [{ filename: "file1.txt" }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);

  await action({
    pull_request: { number: prNumber, head: { sha: "deadbeef" } },
  });
  await action();
  mockAgent.assertNoPendingInterceptors();
});

test("action with crop missing lines", async () => {
  const { action } = await import("../src/action");
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "100";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_SHOW_MISSING"] = "true";
  process.env["INPUT_SHOW_MISSING_MAX_LENGTH"] = "10";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "false";
  process.env["INPUT_PULL_REQUEST_NUMBER"] = "";
  const prNumber = 1;
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);

  await action({
    pull_request: { number: prNumber, head: { sha: "deadbeef" } },
  });
  await action();
  mockAgent.assertNoPendingInterceptors();
});

test("action failing on coverage below threshold", async () => {
  const { action } = await import("../src/action");
  const prNumber = 123;
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "100";
  process.env["INPUT_FAIL_BELOW_THRESHOLD"] = "true";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_SHOW_MISSING"] = "false";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "false";
  process.env["INPUT_PULL_REQUEST_NUMBER"] = String(prNumber);
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/pulls/${prNumber}`,
    })
    .reply(
      200,
      { head: { sha: "deadbeef" } },
      { headers: { "content-type": "application/json" } },
    );
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);

  await action({
    push: { ref: "master" },
  });
  expect(process.exitCode).toBe(1);
  expect(process.stdout.write).toHaveBeenCalledTimes(1);
  expect(process.stdout.write).toHaveBeenCalledWith(
    "::error::Minimum coverage requirement was not satisfied\n",
  );
  mockAgent.assertNoPendingInterceptors();
});

test("action not failing on coverage above threshold", async () => {
  const { action } = await import("../src/action");
  const prNumber = 123;
  process.env["INPUT_PATH"] = "./coverage-action/src/fixtures/test-branch.xml";
  process.env["INPUT_SKIP_COVERED"] = "true";
  process.env["INPUT_SHOW_BRANCH"] = "false";
  process.env["INPUT_SHOW_LINE"] = "false";
  process.env["INPUT_MINIMUM_COVERAGE"] = "82";
  process.env["INPUT_FAIL_BELOW_THRESHOLD"] = "true";
  process.env["INPUT_SHOW_CLASS_NAMES"] = "false";
  process.env["INPUT_SHOW_MISSING"] = "false";
  process.env["INPUT_ONLY_CHANGED_FILES"] = "false";
  process.env["INPUT_PULL_REQUEST_NUMBER"] = String(prNumber);
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/pulls/${prNumber}`,
    })
    .reply(
      200,
      { head: { sha: "deadbeef" } },
      { headers: { "content-type": "application/json" } },
    );
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);
  await action({
    push: { ref: "master" },
  });
  expect(process.exitCode).toBe(0);
  expect(process.stdout.write).toHaveBeenCalledTimes(0);
  mockAgent.assertNoPendingInterceptors();
});

test("markdownReport", async () => {
  const { markdownReport } = await import("../src/action");
  const commit = "deadbeef";
  const defaultReportName = "Coverage Report";
  expect(
    markdownReport([dummyReport], commit, {
      minimumCoverage: 70,
      reportTitle: "Test title",
    }),
  ).toBe(`## Test title

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :white_check_mark: |
| \\_\\_init\\_\\_.py | \`80%\` | :white_check_mark: |
| bar.py | \`75%\` | :white_check_mark: |
| foo.py | \`75%\` | :white_check_mark: |

_Minimum allowed coverage is \`70%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(markdownReport([dummyReport], commit))
    .toBe(`## ${defaultReportName}

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :x: |
| \\_\\_init\\_\\_.py | \`80%\` | :x: |
| bar.py | \`75%\` | :x: |
| foo.py | \`75%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, {
      minimumCoverage: 70,
      showLine: true,
    }),
  ).toBe(`## ${defaultReportName}

| File | Coverage | Lines |   |
| - | :-: | :-: | :-: |
| **All files** | \`77%\` | \`77%\` | :white_check_mark: |
| \\_\\_init\\_\\_.py | \`80%\` | \`80%\` | :white_check_mark: |
| bar.py | \`75%\` | \`80%\` | :white_check_mark: |
| foo.py | \`75%\` | \`100%\` | :white_check_mark: |

_Minimum allowed coverage is \`70%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, {
      minimumCoverage: 70,
      showBranch: true,
    }),
  ).toBe(`## ${defaultReportName}

| File | Coverage | Branches |   |
| - | :-: | :-: | :-: |
| **All files** | \`77%\` | \`0%\` | :white_check_mark: |
| \\_\\_init\\_\\_.py | \`80%\` | \`0%\` | :white_check_mark: |
| bar.py | \`75%\` | \`0%\` | :white_check_mark: |
| foo.py | \`75%\` | \`75%\` | :white_check_mark: |

_Minimum allowed coverage is \`70%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, {
      minimumCoverage: 70,
      showLine: true,
      showBranch: true,
    }),
  ).toBe(`## ${defaultReportName}

| File | Coverage | Lines | Branches |   |
| - | :-: | :-: | :-: | :-: |
| **All files** | \`77%\` | \`77%\` | \`0%\` | :white_check_mark: |
| \\_\\_init\\_\\_.py | \`80%\` | \`80%\` | \`0%\` | :white_check_mark: |
| bar.py | \`75%\` | \`80%\` | \`0%\` | :white_check_mark: |
| foo.py | \`75%\` | \`100%\` | \`75%\` | :white_check_mark: |

_Minimum allowed coverage is \`70%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, {
      minimumCoverage: 70,
      showLine: true,
      showBranch: true,
      showMissing: true,
    }),
  ).toBe(`## ${defaultReportName}

| File | Coverage | Lines | Branches |   | Missing |
| - | :-: | :-: | :-: | :-: | :-: |
| **All files** | \`77%\` | \`77%\` | \`0%\` | :white_check_mark: |   |
| \\_\\_init\\_\\_.py | \`80%\` | \`80%\` | \`0%\` | :white_check_mark: | \`24-26\` |
| bar.py | \`75%\` | \`80%\` | \`0%\` | :white_check_mark: | \`23-24\` \`39-40\` \`50\` |
| foo.py | \`75%\` | \`100%\` | \`75%\` | :white_check_mark: |   |

_Minimum allowed coverage is \`70%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, {
      minimumCoverage: 70,
      showLine: true,
      showBranch: true,
      showMissing: true,
      showMissingMaxLength: 5,
    }),
  ).toBe(`## ${defaultReportName}

| File | Coverage | Lines | Branches |   | Missing |
| - | :-: | :-: | :-: | :-: | :-: |
| **All files** | \`77%\` | \`77%\` | \`0%\` | :white_check_mark: |   |
| \\_\\_init\\_\\_.py | \`80%\` | \`80%\` | \`0%\` | :white_check_mark: | \`24-26\` |
| bar.py | \`75%\` | \`80%\` | \`0%\` | :white_check_mark: | \`23-24\` &hellip; |
| foo.py | \`75%\` | \`100%\` | \`75%\` | :white_check_mark: |   |

_Minimum allowed coverage is \`70%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(markdownReport([dummyReport], commit, { minimumCoverage: 80 }))
    .toBe(`## ${defaultReportName}

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :x: |
| \\_\\_init\\_\\_.py | \`80%\` | :white_check_mark: |
| bar.py | \`75%\` | :x: |
| foo.py | \`75%\` | :x: |

_Minimum allowed coverage is \`80%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(markdownReport([dummyReport], commit, { showClassNames: true }))
    .toBe(`## ${defaultReportName}

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :x: |
| ClassFoo | \`80%\` | :x: |
| ClassBar | \`75%\` | :x: |
| ClassMoo | \`75%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(markdownReport([dummyReport], commit, { filteredFiles: ["bar.py"] }))
    .toBe(`## ${defaultReportName}

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :x: |
| bar.py | \`75%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, { filteredFiles: ["README.md"] }),
  ).toBe(`## ${defaultReportName}

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(markdownReport([dummyReport], commit, { filteredFiles: [] }))
    .toBe(`## ${defaultReportName}

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport(
      [
        {
          folder: "foo.xml",
          ...dummyReport,
        },
        {
          folder: "bar.xml",
          ...dummyReport,
        },
      ],
      commit,
      { filteredFiles: [] },
    ),
  ).toBe(`## ${defaultReportName} foo.xml

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :x: |

## ${defaultReportName} bar.xml

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`77%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, {
      showMissing: true,
      linkMissingLines: true,
      showMissingMaxLength: 200,
    }),
  ).toBe(`## ${defaultReportName}

| File | Coverage |   | Missing |
| - | :-: | :-: | :-: |
| **All files** | \`77%\` | :x: |   |
| \\_\\_init\\_\\_.py | \`80%\` | :x: | [\`24-26\`](https://github.com/someowner/somerepo/blob/deadbeef/__init__.py?plain=1#L24-L26) |
| bar.py | \`75%\` | :x: | [\`23-24\`](https://github.com/someowner/somerepo/blob/deadbeef/bar.py?plain=1#L23-L24) [\`39-40\`](https://github.com/someowner/somerepo/blob/deadbeef/bar.py?plain=1#L39-L40) [\`50\`](https://github.com/someowner/somerepo/blob/deadbeef/bar.py?plain=1#L50) |
| foo.py | \`75%\` | :x: |   |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, {
      showMissing: true,
      linkMissingLines: true,
      linkMissingLinesSourceDir: "path/to/src/",
      showMissingMaxLength: 200,
    }),
  ).toBe(`## ${defaultReportName}

| File | Coverage |   | Missing |
| - | :-: | :-: | :-: |
| **All files** | \`77%\` | :x: |   |
| \\_\\_init\\_\\_.py | \`80%\` | :x: | [\`24-26\`](https://github.com/someowner/somerepo/blob/deadbeef/path/to/src/__init__.py?plain=1#L24-L26) |
| bar.py | \`75%\` | :x: | [\`23-24\`](https://github.com/someowner/somerepo/blob/deadbeef/path/to/src/bar.py?plain=1#L23-L24) [\`39-40\`](https://github.com/someowner/somerepo/blob/deadbeef/path/to/src/bar.py?plain=1#L39-L40) [\`50\`](https://github.com/someowner/somerepo/blob/deadbeef/path/to/src/bar.py?plain=1#L50) |
| foo.py | \`75%\` | :x: |   |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);

  expect(
    markdownReport([dummyReport], commit, {
      showMissing: true,
      linkMissingLines: true,
      showMissingMaxLength: 12,
    }),
  ).toBe(`## ${defaultReportName}

| File | Coverage |   | Missing |
| - | :-: | :-: | :-: |
| **All files** | \`77%\` | :x: |   |
| \\_\\_init\\_\\_.py | \`80%\` | :x: | [\`24-26\`](https://github.com/someowner/somerepo/blob/deadbeef/__init__.py?plain=1#L24-L26) |
| bar.py | \`75%\` | :x: | [\`23-24\`](https://github.com/someowner/somerepo/blob/deadbeef/bar.py?plain=1#L23-L24) [\`39-40\`](https://github.com/someowner/somerepo/blob/deadbeef/bar.py?plain=1#L39-L40) &hellip; |
| foo.py | \`75%\` | :x: |   |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`);
  mockAgent.assertNoPendingInterceptors();
});

test("markdownReport includes package coverage", async () => {
  const { markdownReport } = await import("../src/action");
  const report = {
    ...dummyReport,
    packages: [{ name: "main", total: 99.5, line: 99, branch: 100 }],
  };

  expect(markdownReport([report], "deadbeef", { minimumCoverage: 75 })).toContain(
    "**Package: main**",
  );
  expect(
    markdownReport([report], "deadbeef", {
      minimumCoverage: 75,
      showPackage: false,
    }),
  ).not.toContain("**Package: main**");
});

test("addComment", async () => {
  const { addComment } = await import("../src/action");
  const prNumber = 5;
  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: "some body", id: 123 }], {
      headers: { "content-type": "application/json" },
    });
  await addComment(prNumber, "foo", "bar");
  mockAgent.assertNoPendingInterceptors();
});

test("addComment with update", async () => {
  const { addComment } = await import("../src/action");
  const prNumber = 5;
  const commentId = 123;
  const oldComment = `## bar

| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`78%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`;

  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: oldComment, id: commentId }], {
      headers: { "content-type": "application/json" },
    });
  apiMock
    .intercept({
      method: "PATCH",
      path: `/repos/${owner}/${repo}/issues/comments/${commentId}`,
    })
    .reply(200, [{ body: oldComment, id: commentId }], {
      headers: { "content-type": "application/json" },
    });

  await addComment(prNumber, "foo", "bar");
  mockAgent.assertNoPendingInterceptors();
});

test("addComment for specific report", async () => {
  const { addComment } = await import("../src/action");
  const prNumber = 5;
  const commentId = 123;
  const report1Comment = `Report1
| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`78%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`;

  apiMock
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200);
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(200, [{ body: report1Comment, id: commentId }], {
      headers: { "content-type": "application/json" },
    });
  await addComment(prNumber, "foo", "Report2");
  mockAgent.assertNoPendingInterceptors();
});

test("addComment with update for specific report", async () => {
  const { addComment } = await import("../src/action");
  const prNumber = 5;
  const comment1Id = 123;
  const comment2Id = 456;
  const report1Comment = `Report1
| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`78%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`;
  const report2Comment = `Report2
| File | Coverage |   |
| - | :-: | :-: |
| **All files** | \`82%\` | :x: |

_Minimum allowed coverage is \`100%\`_

> Generated by 🐐 [goatwu1993/actions/coverage-action](https://github.com/goatwu1993/actions/tree/main/coverage-action) v1.0.0 against deadbeef`;

  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    })
    .reply(
      200,
      [
        { body: report1Comment, id: comment1Id },
        { body: report2Comment, id: comment2Id },
      ],
      {
        headers: { "content-type": "application/json" },
      },
    );
  apiMock
    .intercept({
      method: "PATCH",
      path: `/repos/${owner}/${repo}/issues/comments/${comment2Id}`,
    })
    .reply(200, [{ body: report2Comment, id: comment2Id }], {
      headers: { "content-type": "application/json" },
    });

  await addComment(prNumber, "foo", "Report2");
  mockAgent.assertNoPendingInterceptors();
});

test("listChangedFiles", async () => {
  const { listChangedFiles } = await import("../src/action");
  const prNumber = 5;
  apiMock
    .intercept({
      method: "GET",
      path: `/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    })
    .reply(200, [{ filename: "file1.txt" }], {
      headers: { "content-type": "application/json" },
    });
  await listChangedFiles(prNumber);
  mockAgent.assertNoPendingInterceptors();
});

test("addCheck", async () => {
  const { addCheck } = await import("../src/action");
  apiMock
    .intercept({ method: "POST", path: `/repos/${owner}/${repo}/check-runs` })
    .reply(200);

  await addCheck("foo", "bar", "fake_sha", "success");
  mockAgent.assertNoPendingInterceptors();
});

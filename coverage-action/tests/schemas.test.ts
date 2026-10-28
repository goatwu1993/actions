import { ZodError } from "zod";
import { expect, test } from "vitest";
import {
  actionPayloadSchema,
  booleanInputSchema,
  coberturaDocumentSchema,
  integerInputSchema,
  minimumCoverageInputSchema,
  pullRequestNumberInputSchema,
} from "../src/schemas";

const klass = {
  "line-rate": "0.5",
  "branch-rate": "0",
  filename: "example.ts",
  name: "Example",
  lines: { line: { number: "12", hits: "0" } },
};

function document(packages: unknown, lineRate = "0.5") {
  return { coverage: { "line-rate": lineRate, "branch-rate": "0", packages } };
}

test("XML schemas normalize single children, arrays, and numbers", () => {
  const packages = [
    { classes: { class: klass } },
    { class: [klass] },
  ];
  const parsed = coberturaDocumentSchema.parse(document({ package: packages }));
  expect(parsed.coverage["line-rate"]).toBe(0.5);
  expect(parsed.coverage.packages.package[0].classes?.class[0]).toEqual({
    ...klass,
    "line-rate": 0.5,
    "branch-rate": 0,
    lines: { line: [{ number: 12, hits: 0 }] },
  });
  expect(parsed.coverage.packages.package[1].class).toHaveLength(1);
});

test("XML schemas support empty containers and flattened packages", () => {
  expect(coberturaDocumentSchema.parse(document("\n ")).coverage.packages.package).toEqual([]);
  const parsed = coberturaDocumentSchema.parse(document({ class: { ...klass, lines: "\n " } }));
  expect(parsed.coverage.packages.class[0].lines?.line).toEqual([]);
});

test.each(["abc", "0.5abc", "", "Infinity", "-0.1", "1.1"])(
  "XML schemas reject invalid rate %j",
  (rate) => {
    expect(() => coberturaDocumentSchema.parse(document({}, rate))).toThrow(ZodError);
  },
);

test("XML schemas reject missing fields and invalid line counts", () => {
  expect(() => coberturaDocumentSchema.parse({ coverage: {} })).toThrow(ZodError);
  for (const line of [{ number: "0", hits: "0" }, { number: "1", hits: "bad" }]) {
    expect(() => coberturaDocumentSchema.parse(document({ class: { ...klass, lines: { line } } }))).toThrow(ZodError);
  }
});

test("webhooks validate consumed fields and allow unrelated event metadata", () => {
  expect(actionPayloadSchema.parse({ after: "abc", repository: { name: "repo" } })).toEqual({ after: "abc" });
  expect(actionPayloadSchema.parse({ workflow_run: { head_commit: null } })).toEqual({ workflow_run: { head_commit: null } });
  expect(() => actionPayloadSchema.parse({ pull_request: { number: 1 } })).toThrow(ZodError);
  expect(() => actionPayloadSchema.parse({ after: 123 })).toThrow(ZodError);
});

test("action inputs validate complete boolean and integer strings", () => {
  expect(booleanInputSchema.parse("false")).toBe(false);
  expect(booleanInputSchema.parse("true")).toBe(true);
  expect(integerInputSchema.parse("-1")).toBe(-1);
  expect(minimumCoverageInputSchema.parse("80")).toBe(80);
  expect(pullRequestNumberInputSchema.parse("42")).toBe(42);
  expect(() => booleanInputSchema.parse("1")).toThrow(ZodError);
  expect(() => integerInputSchema.parse("80abc")).toThrow(ZodError);
  expect(() => minimumCoverageInputSchema.parse("101")).toThrow(ZodError);
  expect(() => pullRequestNumberInputSchema.parse("0")).toThrow(ZodError);
});

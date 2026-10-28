import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(
  readFileSync(new URL("./coverage-action/package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  define: { __COVERAGE_ACTION_VERSION__: JSON.stringify(version) },
  test: {
    environment: "node",
    include: ["coverage-action/tests/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      include: ["coverage-action/src/**/*.ts"],
      reporter: ["text", "cobertura", "html"],
      reportsDirectory: "coverage",
    },
  },
});

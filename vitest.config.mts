import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["coverage-action/tests/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      include: ["coverage-action/src/**/*.ts"],
      reporter: ["text", "cobertura", "html"],
      reportsDirectory: "coverage-action/coverage",
    },
  },
});

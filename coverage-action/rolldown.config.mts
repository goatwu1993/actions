import { defineConfig } from "rolldown";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  input: "index.ts",
  platform: "node",
  transform: {
    target: "node24",
    define: { __COVERAGE_ACTION_VERSION__: JSON.stringify(version) },
  },
  output: { file: "dist/index.js", format: "cjs", minify: true },
});

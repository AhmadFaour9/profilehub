import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // Only this project's suite. front-end/ holds a design handoff that ships
    // its own node --test files, which Vitest cannot run and should not try.
    include: ["tests/**/*.test.ts"],
  },
});

import { defineConfig } from "vitest/config";

// Unit tests only: they never open a database connection.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});

import { defineConfig } from "vitest/config";

// Unit tests never open a database connection; `*.integration.test.ts` files run only with
// INTEGRATION_DATABASE=1 (`npm run test:integration`, CI's database job) and are skipped otherwise.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});

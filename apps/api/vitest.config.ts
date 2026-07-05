import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: "./test/global-setup.ts",
    // Los tests comparten una base de datos: sin paralelismo entre archivos.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/ligas_test?schema=public",
      JWT_SECRET: "test-secret-para-integracion-32chars!!",
    },
  },
});

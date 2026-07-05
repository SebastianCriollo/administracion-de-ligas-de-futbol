import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Chromium del sistema si existe (entornos gestionados); si no, el de Playwright.
const systemChromium = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // los flujos comparten la base de datos
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    ...(existsSync(systemChromium) && {
      launchOptions: { executablePath: systemChromium },
    }),
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: "pnpm --filter @ligas/api dev",
          url: "http://localhost:4000/api/v1/health",
          reuseExistingServer: true,
          cwd: "../..",
          timeout: 60_000,
        },
        {
          command: "pnpm --filter @ligas/web start",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          cwd: "../..",
          timeout: 60_000,
        },
      ],
});

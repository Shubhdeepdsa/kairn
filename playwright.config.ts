import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: { browserName: "chromium", headless: true },
  reporter: "list",
});

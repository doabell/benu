import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/browser",
    testMatch: "startup.spec.ts",
    workers: 2,
    use: { baseURL: "http://127.0.0.1:5174", trace: "retain-on-failure" },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } }
    ],
    webServer: {
        command: "bun run dev --host 127.0.0.1 --port 5174 --strictPort",
        url: "http://127.0.0.1:5174",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
    }
});

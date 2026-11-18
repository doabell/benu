import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.BENU_TEST_PORT ?? 5174);

export default defineConfig({
    testDir: "./tests/browser",
    testMatch: ["startup.spec.ts", "ui.spec.ts"],
    workers: 2,
    use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure" },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } }
    ],
    webServer: {
        command: `bun run dev --host 127.0.0.1 --port ${port} --strictPort`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
    }
});

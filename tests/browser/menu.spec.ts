import { expect, test, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const selection = "/?dateStr=2026-07-21&place=proctor-dining-hall&meal=lunch";
const body = (name: string) =>
    JSON.stringify([
        {
            title: "Main",
            items: [{ id: 1, position: 1, name, iconNames: ["Vegan"] }]
        }
    ]);
const headers = (etag: string) => ({
    "Content-Type": "application/json",
    "X-Menu-Result": "ok",
    "X-Menu-Fetched-At": new Date().toISOString(),
    ETag: `"${etag}"`,
    "Cache-Control": "public, max-age=21600",
    Date: new Date().toUTCString()
});

async function mockMenus(
    context: BrowserContext,
    getName = () => "Saved soup"
) {
    await context.route("**/api/menu?**", async (route) => {
        const name = getName();
        await route.fulfill({
            status: 200,
            headers: headers(name),
            body: body(name)
        });
    });
}

test("shows a saved menu immediately during a slow background request", async ({
    page,
    context
}) => {
    await mockMenus(context);
    await page.goto(selection);
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await page
        .getByRole("button", { name: "Vegan: included", exact: true })
        .click();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await expect
        .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
        .toBe(true);

    const gate = Promise.withResolvers<void>();
    await context.route("**/api/menu?**", async (route) => {
        await gate.promise;
        await route.fulfill({
            status: 200,
            headers: headers("new"),
            body: body("Updated soup")
        });
    });
    try {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByText("Saved soup", { exact: true })).toBeVisible(
            { timeout: 1500 }
        );
        await expect(
            page.getByText("Loading", { exact: true })
        ).not.toBeVisible();
    } finally {
        gate.resolve();
    }
    await expect(page.getByText("Updated soup", { exact: true })).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Vegan: only", exact: true })
    ).toBeVisible();
    await page.screenshot({
        path: "test-results/menu-desktop.png",
        fullPage: true
    });
});

test("starts offline from saved assets and menus", async ({
    page,
    context
}) => {
    await mockMenus(context);
    await page.goto(selection);
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await expect
        .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
        .toBe(true);
    await context.unroute("**/api/menu?**");
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await expect(page.getByText("Offline · Saved menus only")).toBeVisible();
    await expect(page.getByText("Loading", { exact: true })).not.toBeVisible();
});

test("refuses a saved menu older than one day", async ({ page, context }) => {
    await mockMenus(context);
    await page.goto(selection);
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        const cache = await caches.open("benu-menu-v3");
        for (const key of await cache.keys()) {
            const response = (await cache.match(key))!;
            const headers = new Headers(response.headers);
            headers.set(
                "X-Menu-Fetched-At",
                new Date(Date.now() - 25 * 3_600_000).toISOString()
            );
            await cache.put(
                key,
                new Response(await response.text(), { headers })
            );
        }
    });
    await context.unroute("**/api/menu?**");
    await context.setOffline(true);
    await page.reload();
    await expect(
        page.getByText("Saved soup", { exact: true })
    ).not.toBeVisible();
    await expect(
        page
            .getByRole("region", { name: "Menu", exact: true })
            .getByText("Not saved for offline use.")
    ).toBeVisible();
});

test("works with denied local preferences and has accessible mobile controls", async ({
    page,
    context
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
            get() {
                throw new DOMException("Blocked", "SecurityError");
            }
        });
    });
    await mockMenus(context);
    await page.goto(selection);
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Ross", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
        page.getByRole("button", { name: "Ross", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/place=ross-dining-hall/);
    await page.goBack();
    await expect(
        page.getByRole("button", { name: "Proctor", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
        )
    ).toBe(true);
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
        path: "test-results/menu-mobile.png",
        fullPage: true
    });
});

test("follows the system theme and preserves explicit overrides", async ({
    page,
    context
}) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await mockMenus(context);
    await page.goto(selection);
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await page
        .getByRole("button", { name: "Switch color theme to Light" })
        .click();
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
        "content",
        "light"
    );
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
        "content",
        "light"
    );
    await page
        .getByRole("button", { name: "Switch color theme to Dark" })
        .click();
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
        "content",
        "light dark"
    );
    expect(
        await page.evaluate(() => localStorage.getItem("mode-watcher-mode"))
    ).toBeNull();
    await page.emulateMedia({ forcedColors: "active" });
    await page.getByRole("button", { name: "Proctor", exact: true }).focus();
    await page.keyboard.press("Tab");
    expect(
        await page
            .getByRole("button", { name: "Ross", exact: true })
            .evaluate((element) => getComputedStyle(element).outlineStyle)
    ).not.toBe("none");
});

test("upgrades the existing service-worker URL and removes old runtime caches", async ({
    page,
    context
}) => {
    await mockMenus(context);
    await context.route("**/sw.js", (route) =>
        route.fulfill({
            contentType: "application/javascript",
            body: `self.addEventListener('install', () => self.skipWaiting());
            self.addEventListener('activate', event => event.waitUntil(Promise.all([
                caches.open('menu-api-v2'), caches.open('documents'), self.clients.claim()
            ])));`
        })
    );
    await page.goto(selection);
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await expect
        .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
        .toBe(true);
    expect(
        await page.evaluate(() => navigator.serviceWorker.controller!.scriptURL)
    ).toMatch(/\/sw\.js$/);
    expect(await page.evaluate(() => caches.keys())).toContain("menu-api-v2");
    await context.unroute("**/sw.js");
    await page.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect
        .poll(() => page.evaluate(() => caches.keys()))
        .not.toContain("menu-api-v2");
    expect(await page.evaluate(() => caches.keys())).not.toContain("documents");
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
});

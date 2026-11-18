import { expect, test, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { menusFixture, menuHeaders, soupSections } from "./fixtures";
import { campusToday, shiftDate } from "../../src/lib/menu/dates";

const selection = "/proctor/lunch/2026-07-21";
const body = (name: string, date = "2026-07-21") =>
    JSON.stringify(menusFixture(date, () => soupSections(name)));
const headers = menuHeaders;

async function mockMenus(
    context: BrowserContext,
    getName = () => "Saved soup"
) {
    await context.route("**/api/menus?**", async (route) => {
        const name = getName();
        await route.fulfill({
            status: 200,
            headers: headers(name),
            body: body(
                name,
                new URL(route.request().url()).searchParams.get("date")!
            )
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
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page
        .getByRole("button", { name: "Vegan: included", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Close filters", exact: true })
        .click();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await expect
        .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
        .toBe(true);

    const gate = Promise.withResolvers<void>();
    await context.route("**/api/menus?**", async (route) => {
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
    await expect(page.locator(".filter-badge")).toHaveText("1");
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(
        page.getByRole("button", { name: "Vegan: only", exact: true })
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Close filters", exact: true })
        .click();
    await page.screenshot({
        path: "test-results/menu-desktop.png",
        fullPage: true
    });
});

test("opens a Today bookmark offline from saved assets and menus", async ({
    page,
    context
}) => {
    await mockMenus(context);
    await page.goto("/proctor/lunch");
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await expect
        .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
        .toBe(true);
    await context.unroute("**/api/menus?**");
    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveURL(/\/proctor\/lunch$/);
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await expect(page.getByText("Offline · Saved menus only")).toBeVisible();
    await expect(page.getByText("Loading", { exact: true })).not.toBeVisible();
});

test("refuses today's saved menu when it is older than one day", async ({
    page,
    context
}) => {
    await mockMenus(context);
    await page.goto("/proctor/lunch");
    await expect(page.getByText("Saved soup", { exact: true })).toBeVisible();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        const cache = await caches.open("benu-menus-v1");
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
    await context.unroute("**/api/menus?**");
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

test("can open a past menu offline even when its original snapshot is a month old", async ({
    page,
    context
}) => {
    const date = shiftDate(campusToday(), -30);
    const day = menusFixture(date, () => {
        const sections = soupSections("Archived soup");
        sections[0].items[0].details = {
            servingSize: "1 cup",
            ingredients: "Lentils and vegetable stock.",
            nutrition: { calories: 140 }
        };
        return sections;
    });
    day.fetchedAt = Date.now() - 30 * 86_400_000;
    const fetchedAt = new Date(day.fetchedAt).toISOString();
    await context.route("**/api/menus?**", (route) =>
        route.fulfill({
            status: 200,
            headers: { ...headers("archive"), "X-Menu-Fetched-At": fetchedAt },
            json: day
        })
    );
    await page.goto("/proctor/lunch/" + date);
    await expect(
        page.getByText("Archived soup", { exact: true })
    ).toBeVisible();
    await expect
        .poll(() =>
            page.evaluate(async (date) => {
                const cache = await caches.open("benu-menus-v1");
                const response = await cache.match("/api/menus?date=" + date);
                return (
                    !!navigator.serviceWorker.controller &&
                    response?.headers.get("X-Menu-Fetched-At")
                );
            }, date)
        )
        .toBe(fetchedAt);
    await context.unroute("**/api/menus?**");
    await context.setOffline(true);
    await page.reload();
    await expect(
        page.getByText("Archived soup", { exact: true })
    ).toBeVisible();
    await expect(page.locator(".saved-menu-note")).toHaveText(
        "Saved 30 days ago"
    );
    await page.getByRole("button", { name: /Archived soup/ }).click();
    const details = page.getByRole("dialog", { name: "Archived soup" });
    await expect(
        details.getByText("Lentils and vegetable stock")
    ).toBeVisible();
    await expect(details.getByText("140 kcal")).toBeVisible();
});

test("starts offline with one saved day containing every hall and meal", async ({
    page,
    context
}) => {
    await context.route("**/api/menus?**", async (route) => {
        await route.fulfill({
            status: 200,
            headers: headers("all"),
            body: JSON.stringify(
                menusFixture("2026-07-21", (hall, meal) =>
                    soupSections(hall + " " + meal + " soup")
                )
            )
        });
    });
    await page.goto(selection.replace("/proctor/", "/all/"));
    for (const hall of [
        "proctor-dining-hall",
        "ross-dining-hall",
        "atwater-dining-hall"
    ]) {
        await expect(
            page.getByText(hall + " lunch soup", { exact: true })
        ).toBeVisible();
    }
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await expect
        .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
        .toBe(true);
    await expect
        .poll(() =>
            page.evaluate(
                async () =>
                    (await (await caches.open("benu-menus-v1")).keys()).length
            )
        )
        .toBe(1);
    await context.unroute("**/api/menus?**");
    await context.setOffline(true);
    await page.reload();
    for (const hall of [
        "proctor-dining-hall",
        "ross-dining-hall",
        "atwater-dining-hall"
    ]) {
        await expect(
            page.getByText(hall + " lunch soup", { exact: true })
        ).toBeVisible();
    }
    await expect(page.locator(".saved-menu-note")).toHaveCount(1);
    await expect(page.getByText("Loading", { exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "Dinner", exact: true }).click();
    for (const hall of [
        "proctor-dining-hall",
        "ross-dining-hall",
        "atwater-dining-hall"
    ])
        await expect(
            page.getByText(hall + " dinner soup", { exact: true })
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
    await expect(page).toHaveURL(/\/ross\//);
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

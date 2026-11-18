import { expect, test, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { menusFixture, menuHeaders } from "./fixtures";
import type { MenuSection } from "../../src/lib/menu/types";
import { campusToday } from "../../src/lib/menu/schedule";
import type { Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });
let pageErrors: string[];
test.beforeEach(({ page }) => {
    pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
});
test.afterEach(() => {
    expect(pageErrors).toEqual([]);
});
const selection = "/all/lunch/2026-07-21";
const controlBounds = (page: Page) =>
    page
        .locator(
            ".controls, .date-selector, .date-selector > button, .hall-tabs > button, .meal-tabs > button, .today-button, .search-toggle, .filter-toggle, .theme-toggle"
        )
        .evaluateAll((elements) =>
            elements
                .filter((element) => element.getBoundingClientRect().width > 0)
                .map((element) => {
                    const { x, y, width, height } =
                        element.getBoundingClientRect();
                    return { x, y, width, height };
                })
        );
function expectStableBounds(
    actual: Awaited<ReturnType<typeof controlBounds>>,
    expected: Awaited<ReturnType<typeof controlBounds>>
): void {
    expect(actual).toHaveLength(expected.length);
    for (let index = 0; index < actual.length; index++)
        for (const key of ["x", "y", "width", "height"] as const)
            expect(
                Math.abs(actual[index][key] - expected[index][key]),
                `Control ${index} ${key} moved`
            ).toBeLessThanOrEqual(1);
}
const hallNames: Record<string, string> = {
    "proctor-dining-hall": "Proctor",
    "ross-dining-hall": "Ross",
    "atwater-dining-hall": "Atwater"
};
function menuSections(hall: string, meal: string, long = false): MenuSection[] {
    return Array.from({ length: long ? 7 : 1 }, (_, section) => ({
        title: long ? `Section ${section + 1}` : "Main",
        items: [
            {
                id: section * 10 + 1,
                position: 1,
                name: `${hall} ${meal} bowl${section ? ` ${section}` : ""}`,
                iconNames: ["Vegan", "Local Ingredient"]
            },
            {
                id: section * 10 + 2,
                position: 2,
                name: `${hall} ${meal} sandwich${section ? ` ${section}` : ""}`,
                iconNames: ["Dairy"]
            },
            ...(long
                ? [
                      {
                          id: section * 10 + 3,
                          position: 3,
                          name: `${hall} side ${section}`,
                          subtext:
                              "A seasonal side with a longer description to test text wrapping on narrow screens.",
                          iconNames: ["Vegan"]
                      }
                  ]
                : [])
        ]
    }));
}
async function mockMenus(context: BrowserContext, long = false): Promise<void> {
    await context.route("**/api/menus?**", (route) => {
        const params = new URL(route.request().url()).searchParams;
        return route.fulfill({
            status: 200,
            headers: menuHeaders(),
            body: JSON.stringify(
                menusFixture(params.get("date")!, (hall, meal) => {
                    const sections = menuSections(hallNames[hall], meal, long);
                    if (long) sections[1].items = sections[1].items.slice(0, 1);
                    return sections;
                })
            )
        });
    });
}

test("applies all three filter states across equal hall panels and clears empty results", async ({
    page,
    context
}) => {
    await mockMenus(context);
    await page.goto(selection);
    for (const hall of Object.values(hallNames))
        await expect(
            page
                .getByRole("region", { name: `${hall} menu`, exact: true })
                .getByText(`${hall} lunch bowl`, { exact: true })
        ).toBeVisible();
    const hallHeading = page.getByRole("heading", {
        name: "Ross",
        exact: true
    });
    await expect(hallHeading.locator("svg")).toHaveCSS(
        "width",
        await hallHeading.evaluate(
            (element) => getComputedStyle(element).fontSize
        )
    );
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page
        .getByRole("button", { name: "Vegan: included", exact: true })
        .click();
    await expect(page.locator(".filter-status")).toHaveText("1 active");
    await expect(page.locator(".item-name")).toHaveCount(3);
    await expect(
        page.getByRole("button", { name: "Vegan: only", exact: true })
    ).toHaveText("🥗Vegan");
    await page
        .getByRole("button", { name: "Vegan: only", exact: true })
        .click();
    await expect(page.locator(".item-name")).toHaveCount(3);
    await expect(page.locator(".item-name").first()).toContainText("sandwich");
    await page.locator(".clear-filters").click();
    await expect(page.locator(".item-name")).toHaveCount(6);
    await expect(page.locator(".clear-filters")).not.toBeVisible();
    await expect(
        page.getByRole("button", { name: "Close filters" })
    ).toBeFocused();
    await page
        .getByRole("button", { name: "Vegan: included", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Dairy: included", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Close filters", exact: true })
        .click();
    await expect(page.getByText("No matches", { exact: true })).toHaveCount(3);
    await page
        .getByRole("region", { name: "Ross menu", exact: true })
        .getByRole("button", { name: "Clear filters" })
        .click();
    await expect(page.locator(".item-name")).toHaveCount(6);
    await page.getByRole("button", { name: "Ross", exact: true }).click();
    await page.goBack();
    await expect(
        page.getByRole("button", { name: "All halls", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
});

test("searches visible menu text and saves custom filters in the browser", async ({
    page,
    context
}) => {
    await page.setViewportSize({ width: 320, height: 844 });
    let menuRequests = 0;
    await context.route("**/api/menus?**", (route) => {
        menuRequests++;
        const date = new URL(route.request().url()).searchParams.get("date")!;
        const day = menusFixture(date, (hall, meal) => {
            const sections = menuSections(hallNames[hall], meal);
            const bowl = sections[0].items[0];
            bowl.details = { ingredients: "Roasted garlic, Chickpeas" };
            bowl.iconNames?.push("Recipe From Home");
            return sections;
        });
        return route.fulfill({
            status: 200,
            headers: menuHeaders(),
            json: day
        });
    });
    await page.goto(selection.replace("/all/", "/ross/"));
    const names = page.locator(".item-name");
    await expect(names).toHaveCount(2);
    const home = page
        .locator(".item-label")
        .filter({ hasText: "Recipe From Home" });
    await expect(home.locator(".label-pictogram")).toHaveText("🏡");

    const before = await controlBounds(page);
    const searchToggle = page.getByRole("button", {
        name: "Search menus",
        exact: true
    });
    const input = page.getByRole("searchbox", { name: "Search menus" });
    await searchToggle.click();
    await expect(input).toBeFocused();
    await expect(input).toBeInViewport();
    expectStableBounds(await controlBounds(page), before);
    await input.fill("GÁRLIC home");
    await expect(names).toHaveText(["Ross lunch bowl"]);
    await page.screenshot({ path: "test-results/search-mobile.png" });
    await input.press("Enter");
    await expect(input).not.toBeVisible();
    await expect(searchToggle).toBeFocused();
    await expect(names).toHaveText(["Ross lunch bowl"]);
    await searchToggle.click();
    await input.fill("absent ingredient");
    const menu = page.getByRole("region", { name: "Menu", exact: true });
    await expect(menu.getByText("No dishes match your search.")).toBeVisible();
    await menu.getByRole("button", { name: "Clear search" }).click();
    await expect(names).toHaveCount(2);
    expect(menuRequests).toBe(1);

    const filters = page.getByRole("button", { name: "Filters", exact: true });
    const dialog = page.getByRole("dialog", { name: "Filters" });
    const term = dialog.getByRole("textbox", { name: "Filter term" });
    const close = dialog.getByRole("button", { name: "Close filters" });
    await filters.click();
    await expect(
        dialog.getByRole("button", { name: "Recipe From Home: included" })
    ).toHaveText("🏡Recipe From Home");
    await term.fill(" garlic ");
    await term.press("Enter");
    await expect(names).toHaveCount(2);
    await dialog.getByRole("button", { name: "garlic: included" }).click();
    await expect(names).toHaveText(["Ross lunch bowl"]);
    await page.screenshot({ path: "test-results/custom-filters-mobile.png" });
    await dialog.getByRole("button", { name: "garlic: only" }).click();
    await expect(names).toHaveText(["Ross lunch sandwich"]);
    await close.click();

    await page.reload();
    await expect(names).toHaveText(["Ross lunch sandwich"]);
    await filters.click();
    await expect(
        dialog.getByRole("button", { name: "garlic: excluded" })
    ).toBeVisible();
    await dialog
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
    await expect(
        dialog.getByRole("button", { name: "garlic: included" })
    ).toBeVisible();
    await expect(names).toHaveCount(2);
    await dialog
        .getByRole("button", { name: "Remove custom filter garlic" })
        .click();
    await expect(
        dialog.getByRole("button", { name: "garlic: included" })
    ).toHaveCount(0);
    expect(
        await page.evaluate(() => localStorage.getItem("customFilters"))
    ).toBeNull();
    expect(await context.cookies()).toEqual([]);
});

test("keeps the requested meal when switching to a hall that does not serve it", async ({
    page,
    context
}) => {
    const requests: string[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/api/menus?")) requests.push(request.url());
    });
    await mockMenus(context);
    await page.goto(
        selection.replace("/all/", "/proctor/").replace("/lunch/", "/dinner/")
    );
    await expect(page.locator(".meal-hours")).toContainText("4:30 PM–8 PM");
    await expect(
        page.getByText("Usually serving now", { exact: true })
    ).not.toBeVisible();
    await page.getByRole("button", { name: "Breakfast", exact: true }).click();
    await page.getByRole("button", { name: "Atwater", exact: true }).click();
    await expect(
        page.getByText("Breakfast isn’t served here", { exact: true })
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Breakfast", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    expect(requests).toHaveLength(1);
    await expect(page).toHaveURL(/\/atwater\/breakfast\/2026-07-21$/);
    await page.reload();
    await expect(
        page.getByText("Breakfast isn’t served here", { exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "View lunch", exact: true }).click();
    await expect(
        page.getByText("Atwater lunch bowl", { exact: true })
    ).toBeVisible();
});

test("handles hall failures separately and shows the original fallback age", async ({
    page,
    context
}) => {
    await context.route("**/api/menus?**", (route) => {
        const params = new URL(route.request().url()).searchParams;
        return route.fulfill({
            status: 200,
            headers: menuHeaders("partial"),
            body: JSON.stringify(
                menusFixture(
                    params.get("date")!,
                    (hall, meal) => menuSections(hallNames[hall], meal),
                    (menu, hall, dailyMenus) => {
                        if (hall === "atwater-dining-hall") {
                            menu.result = "error";
                            menu.sections = [];
                        }
                        if (hall === "proctor-dining-hall") {
                            dailyMenus.fetchedAt = Date.now() - 5.5 * 3_600_000;
                            dailyMenus.fallback = true;
                        }
                    }
                )
            )
        });
    });
    await page.goto(selection);
    await expect(
        page.getByText("Proctor lunch bowl", { exact: true })
    ).toBeVisible();
    await expect(
        page.getByText("Ross lunch bowl", { exact: true })
    ).toBeVisible();
    await expect(
        page
            .getByRole("region", { name: "Atwater menu" })
            .getByText("Menu unavailable", { exact: true })
    ).toBeVisible();
    await expect(
        page.getByText("Saved 5 hours ago · Latest check unavailable", {
            exact: true
        })
    ).toBeVisible();
    await context.setOffline(true);
    await expect(
        page.getByText("Offline · Saved menus only", { exact: true })
    ).toBeVisible();
    await page
        .getByRole("region", { name: "Atwater menu" })
        .getByRole("button", { name: "Try again" })
        .click();
    await expect(
        page.getByText("Proctor lunch bowl", { exact: true })
    ).toBeVisible();
    await expect(
        page.getByText("Ross lunch bowl", { exact: true })
    ).toBeVisible();
    await expect(
        page
            .getByRole("region", { name: "Atwater menu" })
            .getByText("Not saved for offline use.", { exact: true })
    ).toBeVisible();
});

test("shares a pending day request when the selected meal changes", async ({
    page,
    context
}) => {
    const gate = Promise.withResolvers<void>();
    let requests = 0;
    await context.route("**/api/menus?**", async (route) => {
        requests++;
        const params = new URL(route.request().url()).searchParams;
        await gate.promise;
        await route
            .fulfill({
                status: 200,
                headers: menuHeaders(),
                body: JSON.stringify(
                    menusFixture(params.get("date")!, (hall, meal) =>
                        menuSections(hallNames[hall], meal)
                    )
                )
            })
            .catch(() => undefined);
    });
    try {
        await page.goto(selection);
        await expect(
            page
                .getByRole("region", { name: "Ross menu" })
                .getByText("Loading", { exact: true })
        ).toBeVisible();
        await page.getByRole("button", { name: "Dinner", exact: true }).click();
        gate.resolve();
        await expect(
            page.getByText("Ross dinner bowl", { exact: true })
        ).toBeVisible();
    } finally {
        gate.resolve();
    }
    await expect(
        page.getByText("Ross lunch bowl", { exact: true })
    ).not.toBeVisible();
    expect(requests).toBe(1);
});

test("falls back to editable native date entry when the picker API is unavailable", async ({
    page,
    context
}) => {
    await page.addInitScript(() =>
        Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
            value: undefined,
            configurable: true
        })
    );
    await mockMenus(context);
    await page.goto(selection);
    await page.getByRole("button", { name: /^Choose menu date:/ }).click();
    const input = page.getByLabel("Menu date", { exact: true });
    await expect(input).toBeVisible();
    await input.fill("2026-07-22");
    await input.press("Tab");
    await expect(page).toHaveURL(/2026-07-22$/);
    await page
        .getByRole("button", { name: "Jump to today", exact: true })
        .click();
    await expect(page).toHaveURL(/\/all\/lunch$/);
    const today = await page.evaluate(() =>
        new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/New_York"
        }).format(new Date())
    );
    await expect(input).toHaveValue(today);
    await expect(
        page.getByRole("button", { name: "Jump to today", exact: true })
    ).not.toBeVisible();
});

test("offers a keyboard skip link without section-jump controls and adapts to narrow and wide screens", async ({
    page,
    context
}) => {
    await mockMenus(context, true);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(selection.replace("/all/", "/proctor/"));
    await expect(
        page.getByText("Proctor lunch bowl", { exact: true })
    ).toBeVisible();
    await expect(
        page.getByText("Jump to section", { exact: true })
    ).toHaveCount(0);
    const skip = page.getByRole("link", { name: "Skip to menu", exact: true });
    expect(
        await skip.evaluate((element) => getComputedStyle(element).clipPath)
    ).not.toBe("none");
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    expect(
        await skip.evaluate((element) => getComputedStyle(element).clipPath)
    ).toBe("none");
    await page.keyboard.press("Enter");
    const target = page.locator("#section-proctor-dining-hall-0");
    await expect(target).toBeFocused();
    const controls = await page.locator(".controls").boundingBox();
    const heading = await target.boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(controls!.y + controls!.height);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
        )
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const sections = await page
        .locator(".menu-section")
        .evaluateAll((elements) =>
            elements.map((element) => {
                const { x, y, bottom } = element.getBoundingClientRect();
                return { x, y, bottom };
            })
        );
    expect(new Set(sections.map((section) => section.x)).size).toBe(2);
    for (const x of new Set(sections.map((section) => section.x))) {
        const column = sections.filter((section) => section.x === x);
        for (let index = 1; index < column.length; index++)
            expect(
                column[index].y - column[index - 1].bottom
            ).toBeLessThanOrEqual(32);
    }
    await page.screenshot({
        path: "test-results/menu-sections-desktop.png",
        fullPage: true
    });
    await page.getByRole("button", { name: "All halls", exact: true }).click();
    await expect(
        page
            .getByRole("region", { name: "Atwater menu" })
            .getByText("Atwater lunch bowl", { exact: true })
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
        path: "test-results/all-halls-desktop.png",
        fullPage: true
    });
});

test("opens grouped filters without moving the page and restores keyboard focus", async ({
    page,
    context
}) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await mockMenus(context);
    await page.goto(selection.replace("/all/", "/ross/"));
    await expect(
        page.getByText("Ross lunch bowl", { exact: true })
    ).toBeVisible();
    const trigger = page.getByRole("button", { name: "Filters", exact: true });
    const dialog = page.getByRole("dialog", { name: "Filters", exact: true });
    const close = dialog.getByRole("button", { name: "Close filters" });
    const clear = dialog
        .locator("header")
        .getByRole("button", { name: "Clear filters" });
    const actions = page.locator(".header-actions > button");
    await expect(actions.nth(0)).toHaveAccessibleName("Jump to today");
    await expect(actions.nth(1)).toHaveAccessibleName("Search menus");
    await expect(actions.nth(2)).toHaveAccessibleName("Filters");
    await expect(actions.nth(3)).toHaveAccessibleName(/Switch color theme/);

    for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        const before = await controlBounds(page);
        await trigger.click();
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Done" })).toHaveCount(
            0
        );
        await expect(
            dialog.getByText(
                "Check with Dining Services about ingredients and allergens.",
                { exact: false }
            )
        ).toBeVisible();
        await expect(page.locator(".filter-toggle")).toHaveAttribute(
            "aria-expanded",
            "true"
        );
        await expect(
            dialog.getByRole("button", { name: /^Vegan:/ })
        ).toBeFocused();
        await expect(dialog.getByRole("group")).toHaveCount(7);
        await expect(
            dialog
                .getByRole("group", { name: "Sourcing", exact: true })
                .getByRole("button", {
                    name: "Local Ingredient: included",
                    exact: true
                })
        ).toBeVisible();
        expectStableBounds(await controlBounds(page), before);
        const bounds = (await dialog.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
        expect(
            await dialog.evaluate(
                (element) => element.scrollWidth <= element.clientWidth
            )
        ).toBe(true);
        if (width === 320) {
            await dialog
                .getByRole("button", { name: "Vegan: included", exact: true })
                .click();
            await expect(page.locator(".filter-badge")).toHaveText("1");
            expect(
                (
                    await new AxeBuilder({ page })
                        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                        .analyze()
                ).violations
            ).toEqual([]);
        }
        await page.screenshot({ path: `test-results/filters-${width}.png` });
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        expectStableBounds(await controlBounds(page), before);
        await trigger.click();
        await expect(
            dialog.getByRole("button", { name: "Vegan: only", exact: true })
        ).toBeVisible();
        await close.click();
        await expect(trigger).toBeFocused();
    }
    await page.setViewportSize({ width: 320, height: 360 });
    await trigger.click();
    const body = dialog.locator(".filter-dialog-body");
    expect(
        await body.evaluate(
            (element) => element.scrollHeight > element.clientHeight
        )
    ).toBe(true);
    await dialog
        .getByRole("group", { name: "Nuts", exact: true })
        .scrollIntoViewIfNeeded();
    await expect(clear).toBeInViewport();
    await expect(close).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await close.click();
    await expect(dialog).not.toBeVisible();
});

test("shows grouped ingredients and nutrition without loading a dish photo", async ({
    page,
    context
}) => {
    await page.setViewportSize({ width: 320, height: 680 });
    const photoUrl =
        "https://api.nutrislice.com/content/asset/serve/image/jpg/428870/thumbnail2";
    let menuRequests = 0;
    let photoRequests = 0;
    await context.route("**/api/menus?**", async (route) => {
        menuRequests++;
        const date = new URL(route.request().url()).searchParams.get("date")!;
        const day = menusFixture(date, () => [
            {
                title: "Main Street",
                items: [
                    {
                        id: 1,
                        position: 1,
                        name: "Impossible Burger",
                        iconNames: ["Vegan", "Soy"],
                        details: {
                            servingSize: "1 patty",
                            ingredients:
                                "Button Mushroom, Lemon Juice (Lemon Juice, Sodium Benzoate, Sodium Metabisulfite, Lemon Oil), Pepper.",
                            nutrition: {
                                calories: 247,
                                proteinGrams: 20,
                                carbGrams: 10,
                                fatGrams: 14,
                                sodiumMg: 399
                            },
                            photoUrl,
                            photoAlt: "Impossible Burger"
                        }
                    },
                    {
                        id: 2,
                        position: 2,
                        name: "Garlic Bread Sticks",
                        iconNames: ["Wheat"]
                    }
                ]
            }
        ]);
        await route.fulfill({ status: 200, headers: menuHeaders(), json: day });
    });
    await context.route(photoUrl, (route) => {
        photoRequests++;
        return route.abort();
    });
    await page.goto(selection.replace("/all/", "/ross/"));
    const trigger = page.getByRole("button", {
        name: "Impossible Burger",
        exact: true
    });
    const dialog = page.getByRole("dialog", { name: "Impossible Burger" });
    const imageSearchName = "Search for an image of Impossible Burger";
    const imageSearch = dialog.getByRole("link", { name: imageSearchName });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await expect(trigger.locator("svg")).toHaveCount(0);
    await expect(page.getByRole("link", { name: imageSearchName })).toHaveCount(
        0
    );
    const before = await controlBounds(page);
    await trigger.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(imageSearch).toBeInViewport();
    await expect(imageSearch).toHaveAttribute(
        "href",
        "https://www.google.com/search?q=Impossible%20Burger&tbm=isch"
    );
    await expect(
        dialog.getByText("1 patty per serving", { exact: true })
    ).toBeVisible();
    await expect(dialog.getByText("247 kcal", { exact: true })).toBeVisible();
    await expect(dialog.getByText("399 mg", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Fiber", { exact: true })).toHaveCount(0);
    const ingredients = dialog
        .getByRole("list", { name: "Ingredients" })
        .getByRole("listitem");
    await expect(ingredients).toHaveCount(3);
    await expect(ingredients.nth(0)).toHaveText("Button Mushroom");
    await expect(ingredients.nth(1)).toContainText("Lemon Juice");
    await expect(
        ingredients.nth(1).locator(".ingredient-components")
    ).toHaveText(
        "Lemon Juice, Sodium Benzoate, Sodium Metabisulfite, Lemon Oil"
    );
    await expect(ingredients.nth(2)).toHaveText("Pepper");
    const body = dialog.getByRole("region", { name: "Dish information" });
    const disclaimer = body.locator(":scope > :last-child");
    await expect(disclaimer).toHaveText(
        "Dietary labels come from menu data and may be incomplete. Check with Dining Services about ingredients and allergens."
    );
    await expect(
        dialog.getByRole("button", { name: "Close dish details" })
    ).toBeFocused();
    await expect(dialog.locator("img")).toHaveCount(0);
    expect(menuRequests).toBe(1);
    expect(
        await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth
        )
    ).toBe(true);
    expect(
        (
            await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                .analyze()
        ).violations
    ).toEqual([]);
    await page.screenshot({ path: "test-results/dish-details-mobile.png" });
    expect(photoRequests).toBe(0);
    await page.keyboard.press("Tab");
    await expect(body).toBeFocused();
    await page.keyboard.press("End");
    await expect(disclaimer).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expectStableBounds(await controlBounds(page), before);

    await page
        .getByRole("button", { name: "Garlic Bread Sticks", exact: true })
        .click();
    const basicDialog = page.getByRole("dialog", {
        name: "Garlic Bread Sticks"
    });
    await expect(basicDialog.getByText("Wheat")).toBeVisible();
    await expect(
        basicDialog.getByRole("link", {
            name: "Search for an image of Garlic Bread Sticks"
        })
    ).toBeVisible();
});

test("shows label pictograms, groups local ingredients, and opens built-in hours", async ({
    page,
    context
}) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await mockMenus(context);
    await page.goto(selection.replace("/all/", "/ross/"));
    await expect(
        page.getByText("Ross lunch bowl", { exact: true })
    ).toBeVisible();
    await expect(page.locator(".item-label .label-pictogram")).toHaveCount(3);
    await expect(
        page.locator(".item-label .label-pictogram").first()
    ).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".header-actions .today-button")).toBeVisible();
    await expect(page.locator(".date-selector .today-button")).toHaveCount(0);
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(
        page
            .getByRole("group", {
                name: "Sourcing",
                exact: true
            })
            .getByRole("button", {
                name: "Local Ingredient: included",
                exact: true
            })
    ).toBeVisible();
    await expect(page.getByText(/Tap once to require/)).toHaveCount(0);
    await page
        .getByRole("button", { name: "Close filters", exact: true })
        .click();
    const trigger = page.getByRole("button", {
        name: "View Ross dining hours",
        exact: true
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
        name: "Dining hours",
        exact: true
    });
    await expect(dialog).toBeVisible();
    await expect(
        dialog.getByText("Eastern Time", { exact: true })
    ).toBeVisible();
    const dialogTop = (await dialog.boundingBox())!.y;
    await expect(
        dialog.getByText("Regular schedule · Eastern time", { exact: true })
    ).toHaveCount(0);
    await expect(
        dialog.getByRole("table", { name: "Ross dining hours", exact: true })
    ).toBeVisible();
    await expect(
        dialog.getByRole("columnheader", { name: "Weekends", exact: true })
    ).toBeVisible();
    await expect(
        dialog.getByRole("button", { name: "Ross", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("row", { name: /Dinner/ })).toContainText(
        "5:30–8:30 PM"
    );
    await expect(
        dialog.getByRole("row", { name: /Continental/ })
    ).toContainText("9:30–11 AM");
    await expect(
        dialog.getByText(
            "Lunch has limited options until 2:30 PM on weekdays.",
            { exact: true }
        )
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Atwater", exact: true }).click();
    expect(
        Math.abs((await dialog.boundingBox())!.y - dialogTop)
    ).toBeLessThanOrEqual(1);
    await expect(dialog.getByRole("row", { name: /Continental/ })).toHaveCount(
        0
    );
    await expect(
        dialog.getByText(/Atwater serves lunch and dinner/)
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Proctor", exact: true }).click();
    expect(
        Math.abs((await dialog.boundingBox())!.y - dialogTop)
    ).toBeLessThanOrEqual(1);
    await expect(
        dialog.getByRole("row", { name: /Continental/ })
    ).toContainText("9:30–11 AM");
    expect(
        await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth
        )
    ).toBe(true);
    expect(
        (
            await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                .analyze()
        ).violations
    ).toEqual([]);
    await page.screenshot({ path: "test-results/hours-mobile.png" });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
});

test("offers all halls only on wide screens and preserves the last individual hall", async ({
    page,
    context
}) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockMenus(context);
    await page.goto(selection);
    await expect(page.locator(".menu-card")).toHaveCount(3);
    await page.getByRole("button", { name: "Ross", exact: true }).click();
    await page.getByRole("button", { name: "All halls", exact: true }).click();
    await expect(
        page.getByText("Atwater lunch bowl", { exact: true })
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
        page.getByRole("button", { name: "All halls", exact: true })
    ).toHaveCount(0);
    await expect(page.locator(".menu-card")).toHaveCount(1);
    await expect(
        page.getByRole("button", { name: "Ross", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
        page.getByText("Ross lunch bowl", { exact: true })
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Lunch", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(
        page.getByRole("button", { name: "All halls", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".menu-card")).toHaveCount(3);
    await page.setViewportSize({ width: 390, height: 844 });
    const requests: string[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/api/menus?")) requests.push(request.url());
    });
    await page.goto(selection);
    await expect(
        page.getByText("Ross lunch bowl", { exact: true })
    ).toBeVisible();
    expect(requests).toHaveLength(1);
});

test("keeps the Benu header out of view when cached and uncached menus replace a long menu", async ({
    page,
    context
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dateGate = Promise.withResolvers<void>();
    const clickPinnedButton = async (name: string): Promise<void> => {
        const bounds = (await page
            .getByRole("button", { name, exact: true })
            .boundingBox())!;
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
        // Click the visible control directly: Chromium's scrollIntoView automation
        // otherwise scrolls this sticky element before the pointer event.
        await page.mouse.click(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2
        );
    };
    await context.route("**/api/menus?**", async (route) => {
        const params = new URL(route.request().url()).searchParams;
        if (params.get("date") !== "2026-07-21") await dateGate.promise;
        await route.fulfill({
            status: 200,
            headers: menuHeaders(),
            body: JSON.stringify(
                menusFixture(params.get("date")!, (hall, meal) =>
                    menuSections(
                        hallNames[hall],
                        meal,
                        hall === "proctor-dining-hall"
                    )
                )
            )
        });
    });
    try {
        await page.goto(selection.replace("/all/", "/ross/"));
        await expect(
            page.getByText("Ross lunch bowl", { exact: true })
        ).toBeVisible();
        await expect
            .poll(() =>
                page.evaluate(
                    async () =>
                        (await (await caches.open("benu-menus-v1")).keys())
                            .length
                )
            )
            .toBe(1);
        await page
            .getByRole("button", { name: "Proctor", exact: true })
            .click();
        await expect(page.locator(".item-name")).toHaveCount(21);
        await page.evaluate(() => window.scrollTo(0, 1000));
        const samples = page.evaluate(
            () =>
                new Promise<number[]>((resolve) => {
                    const positions: number[] = [];
                    const sample = (): void => {
                        positions.push(
                            document
                                .querySelector(".site-header")!
                                .getBoundingClientRect().bottom
                        );
                        if (positions.length < 45)
                            requestAnimationFrame(sample);
                        else resolve(positions);
                    };
                    requestAnimationFrame(sample);
                })
        );
        await clickPinnedButton("Ross");
        await expect(
            page.getByText("Ross lunch bowl", { exact: true })
        ).toBeVisible({ timeout: 1500 });
        expect(Math.max(...(await samples))).toBeLessThanOrEqual(1);
        const originalLink = (await page.locator(".menu-link").boundingBox())!;
        const footer = (await page
            .locator(".app-shell > footer")
            .boundingBox())!;
        expect(
            footer.y - originalLink.y - originalLink.height
        ).toBeLessThanOrEqual(80);
        await page.evaluate(() => window.scrollTo(0, 150));
        await clickPinnedButton("Dinner");
        await expect(
            page.getByText("Ross dinner bowl", { exact: true })
        ).toBeVisible();
        await clickPinnedButton("Next day");
        await expect(page.getByText("Loading", { exact: true })).toBeVisible();
        expect(
            await page
                .locator(".site-header")
                .evaluate((element) => element.getBoundingClientRect().bottom)
        ).toBeLessThanOrEqual(1);
        dateGate.resolve();
        await expect(
            page.getByText("Ross dinner bowl", { exact: true })
        ).toBeVisible();
        expect(
            await page
                .locator(".site-header")
                .evaluate((element) => element.getBoundingClientRect().bottom)
        ).toBeLessThanOrEqual(1);
    } finally {
        dateGate.resolve();
    }
});

test("loads a date once while switching every hall and meal", async ({
    page,
    context
}) => {
    let requests = 0;
    page.on("request", (request) => {
        if (request.url().includes("/api/menus?")) requests++;
    });
    await mockMenus(context);
    await page.goto(selection.replace("/all/", "/proctor/"));
    await expect(
        page.getByText("Proctor lunch bowl", { exact: true })
    ).toBeVisible();
    for (const hall of Object.values(hallNames)) {
        await page.getByRole("button", { name: hall, exact: true }).click();
        for (const meal of ["Breakfast", "Lunch", "Dinner"]) {
            await page.getByRole("button", { name: meal, exact: true }).click();
            await expect(
                page.getByText(
                    hall === "Atwater" && meal === "Breakfast"
                        ? "Breakfast isn’t served here"
                        : `${hall} ${meal.toLowerCase()} bowl`,
                    { exact: true }
                )
            ).toBeVisible();
            await expect(
                page.getByText("Loading", { exact: true })
            ).not.toBeVisible();
        }
    }
    expect(requests).toBe(1);
});

test("formats Eastern hours using the browser's 24-hour locale", async ({
    browser
}) => {
    const context = await browser.newContext({
        locale: "en-GB",
        timezoneId: "Asia/Singapore",
        serviceWorkers: "block"
    });
    try {
        await context.addInitScript(() =>
            Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
                value: undefined,
                configurable: true
            })
        );
        await mockMenus(context);
        const page = await context.newPage();
        await page.goto(
            selection.replace("/all/", "/ross/").replace("/lunch/", "/dinner/")
        );
        await expect(page.locator(".meal-hours")).toContainText(
            "17:30–20:30 EDT"
        );
        await expect(page.getByText(/\d+ items/)).toHaveCount(0);
        await page
            .getByRole("button", { name: "View Ross dining hours" })
            .click();
        const dialog = page.getByRole("dialog", {
            name: "Dining hours",
            exact: true
        });
        await expect(dialog.getByRole("row", { name: /Dinner/ })).toContainText(
            "17:30–20:30"
        );
        await expect(
            dialog.getByText("Eastern Time", { exact: true })
        ).toBeVisible();
        await expect(
            dialog.getByText(
                "Lunch has limited options until 14:30 on weekdays.",
                { exact: true }
            )
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: /^Choose menu date:/ }).click();
        const input = page.getByLabel("Menu date", { exact: true });
        await input.fill("2026-01-13");
        await input.press("Tab");
        await expect(page.locator(".meal-hours")).toContainText(
            "17:30–20:30 EST"
        );
    } finally {
        await context.close();
    }
});

test("keeps date arrows and toolbar targets still across dates, tabs, and native date entry", async ({
    page,
    context
}) => {
    await context.addInitScript(() =>
        Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
            value: undefined,
            configurable: true
        })
    );
    await mockMenus(context);
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`/ross/lunch/${campusToday()}`);
        await expect(
            page.getByText("Ross lunch bowl", { exact: true })
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        ).toBe(true);
        const original = await controlBounds(page);
        const menuTop = (await page.locator(".menu-content").boundingBox())!.y;
        for (const name of [
            "Next day",
            "Next day",
            "Previous day",
            "Previous day",
            "Dinner",
            "Breakfast",
            "Proctor",
            "Ross",
            "Atwater"
        ]) {
            await test.step(`${width}px: ${name}`, async () => {
                await page.getByRole("button", { name, exact: true }).click();
                expectStableBounds(await controlBounds(page), original);
                expect(
                    Math.abs(
                        (await page.locator(".menu-content").boundingBox())!.y -
                            menuTop
                    ),
                    "Menu start moved"
                ).toBeLessThanOrEqual(1);
            });
        }
        await page.getByRole("button", { name: /^Choose menu date:/ }).click();
        expectStableBounds(await controlBounds(page), original);
        const input = page.getByLabel("Menu date", { exact: true });
        await input.fill("2027-09-30");
        await input.press("Tab");
        expectStableBounds(await controlBounds(page), original);
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        ).toBe(true);
    }
});

test("keeps the page shell stable while menu data and fonts arrive late", async ({
    page,
    context
}) => {
    const menuGate = Promise.withResolvers<void>();
    const fontGate = Promise.withResolvers<void>();
    let heldFonts = 0;
    await context.addInitScript(() => {
        const values: number[] = [];
        Object.assign(window, { layoutShiftValues: values });
        if (PerformanceObserver.supportedEntryTypes.includes("layout-shift"))
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries() as (PerformanceEntry & {
                    value: number;
                    hadRecentInput: boolean;
                })[])
                    if (!entry.hadRecentInput) values.push(entry.value);
            }).observe({ type: "layout-shift", buffered: true });
    });
    await context.route("**/*.woff2", async (route) => {
        heldFonts++;
        await fontGate.promise;
        await route.continue();
    });
    await context.route("**/api/menus?**", async (route) => {
        await menuGate.promise;
        await route.fulfill({
            status: 200,
            headers: menuHeaders(),
            body: JSON.stringify(
                menusFixture(
                    new URL(route.request().url()).searchParams.get("date")!,
                    () => [
                        {
                            title: "Main",
                            items: [
                                {
                                    id: 1,
                                    position: 1,
                                    name: "Late soup",
                                    iconNames: ["Vegan"]
                                }
                            ]
                        }
                    ]
                )
            )
        });
    });
    try {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(`/ross/lunch/${campusToday()}`, {
            waitUntil: "domcontentloaded"
        });
        await expect(
            page.getByRole("button", { name: "Ross", exact: true })
        ).toBeEnabled();
        await expect(page.getByText("Loading", { exact: true })).toBeVisible();
        expect(heldFonts).toBeGreaterThan(0);
        const shellBounds = () =>
            page
                .locator(
                    ".controls, .header-actions, .meal-hours, .menu-content"
                )
                .evaluateAll((elements) =>
                    elements.map((element) => {
                        const { x, y, width, height } =
                            element.getBoundingClientRect();
                        return { x, y, width, height };
                    })
                );
        const pending = await shellBounds();
        menuGate.resolve();
        await expect(
            page.getByText("Late soup", { exact: true })
        ).toBeVisible();
        expectStableBounds(await shellBounds(), pending);
        fontGate.resolve();
        await page.evaluate(async () => {
            await document.fonts.ready;
            await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
            );
        });
        expectStableBounds(await shellBounds(), pending);
        const shifts = await page.evaluate(
            () =>
                (window as unknown as { layoutShiftValues: number[] })
                    .layoutShiftValues
        );
        expect(shifts.reduce((sum, value) => sum + value, 0)).toBeLessThan(
            0.02
        );
    } finally {
        menuGate.resolve();
        fontGate.resolve();
    }
});

import { expect, test } from "@playwright/test";
import { menusFixture, menuHeaders, soupSections } from "./fixtures";

test.use({ serviceWorkers: "block" });

for (const { entry, savedPlace } of [
    { entry: "/", savedPlace: undefined },
    { entry: "/ross/lunch", savedPlace: undefined },
    { entry: "/ross/lunch/2026-07-21", savedPlace: undefined },
    { entry: "/", savedPlace: "ross-dining-hall" }
]) {
    test(`loads menus from ${entry} with ${savedPlace ?? "default"} preference without startup errors`, async ({
        page,
        context
    }) => {
        const errors: string[] = [];
        const consoleErrors: string[] = [];
        const failedRequests: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("requestfailed", (request) =>
            failedRequests.push(request.url())
        );
        if (savedPlace)
            await context.addInitScript(
                (place) => localStorage.setItem("place", place),
                savedPlace
            );
        await context.route("**/api/menus?**", (route) =>
            route.fulfill({
                status: 200,
                headers: menuHeaders("startup"),
                body: JSON.stringify(
                    menusFixture(
                        new URL(route.request().url()).searchParams.get(
                            "date"
                        )!,
                        () => soupSections("Startup soup")
                    )
                )
            })
        );
        await page.goto(entry);
        await expect(
            page.getByText("Startup soup", { exact: true })
        ).toBeVisible();
        const mealGroup = page.getByRole("group", {
            name: "Select meal",
            exact: true
        });
        const initialMeal = await mealGroup
            .getByRole("button", { pressed: true })
            .textContent();
        await expect(page).toHaveURL((url) => url.pathname === entry);
        const originalUrl = page.url();
        expect(errors).toEqual([]);
        await page
            .getByRole("button", { name: "Atwater", exact: true })
            .click();
        const date = entry.split("/")[3];
        await expect(page).toHaveURL(
            new RegExp(
                "/atwater/(breakfast|lunch|dinner)" +
                    (date ? "/" + date : "") +
                    "$"
            )
        );
        await page.goBack();
        await expect(page).toHaveURL(originalUrl);
        await expect(
            page.getByRole("button", {
                name: savedPlace || entry.includes("ross") ? "Ross" : "Proctor",
                exact: true
            })
        ).toHaveAttribute("aria-pressed", "true");
        await expect(
            mealGroup.getByRole("button", { pressed: true })
        ).toHaveText(initialMeal!);
        expect(errors).toEqual([]);
        expect(
            failedRequests.filter((url) => /^(file:|data:image\/svg)/.test(url))
        ).toEqual([]);
        expect(
            consoleErrors.filter((message) =>
                /file:\/\/|Unable to load image|data:image\/svg/.test(message)
            )
        ).toEqual([]);
    });
}

test("Today bookmarks follow Eastern midnight while dated history stays fixed", async ({
    page,
    context
}) => {
    let now = new Date("2026-11-18T04:59:00Z");
    await page.clock.setFixedTime(now);
    await context.route("**/api/menus?**", (route) => {
        const date = new URL(route.request().url()).searchParams.get("date")!;
        const day = menusFixture(date, () => soupSections("Soup for " + date));
        day.fetchedAt = now.getTime();
        return route.fulfill({
            status: 200,
            headers: {
                ...menuHeaders(date),
                "X-Menu-Fetched-At": now.toISOString()
            },
            json: day
        });
    });
    const todayUrl = "/ross/lunch";
    await page.goto(todayUrl);
    await expect(
        page.getByText("Soup for 2026-11-17", { exact: true })
    ).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === todayUrl);

    await page
        .getByRole("button", { name: "Previous day", exact: true })
        .click();
    const pinnedUrl = todayUrl + "/2026-11-16";
    await expect(page).toHaveURL((url) => url.pathname === pinnedUrl);
    await expect(
        page.getByText("Soup for 2026-11-16", { exact: true })
    ).toBeVisible();

    now = new Date("2026-11-18T05:01:00Z");
    await page.clock.setFixedTime(now);
    await page
        .getByRole("button", { name: "Jump to today", exact: true })
        .click();
    await expect(page).toHaveURL((url) => url.pathname === todayUrl);
    await expect(
        page.getByText("Soup for 2026-11-18", { exact: true })
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname === pinnedUrl);
    await expect(
        page.getByText("Soup for 2026-11-16", { exact: true })
    ).toBeVisible();
    await page.reload();
    await expect(
        page.getByText("Soup for 2026-11-16", { exact: true })
    ).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL((url) => url.pathname === todayUrl);
    await expect(
        page.getByText("Soup for 2026-11-18", { exact: true })
    ).toBeVisible();
});

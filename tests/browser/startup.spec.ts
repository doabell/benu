import { expect, test } from "@playwright/test";

for (const { entry, savedPlace } of [
    { entry: "/", savedPlace: undefined },
    { entry: "/?place=ross-dining-hall", savedPlace: undefined },
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
        await context.route("**/api/menu?**", (route) =>
            route.fulfill({
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "X-Menu-Result": "ok",
                    "X-Menu-Fetched-At": new Date().toISOString(),
                    ETag: '"startup"'
                },
                body: JSON.stringify([
                    {
                        title: "Main",
                        items: [{ id: 1, position: 1, name: "Startup soup" }]
                    }
                ])
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
            .innerText();
        await expect(page).toHaveURL(new URL(entry, page.url()).href);
        expect(errors).toEqual([]);
        await page
            .getByRole("button", { name: "Atwater", exact: true })
            .click();
        await expect(page).toHaveURL(/place=atwater-dining-hall/);
        await page.goBack();
        await expect(
            page.getByRole("button", {
                name: savedPlace || entry.includes("ross") ? "Ross" : "Proctor",
                exact: true
            })
        ).toHaveAttribute("aria-pressed", "true");
        await expect(
            mealGroup.getByRole("button", { pressed: true })
        ).toHaveText(initialMeal);
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

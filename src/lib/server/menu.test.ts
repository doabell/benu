import { describe, expect, it, vi } from "vitest";
import { fetchWeekMenu } from "./menu";
import { menuWeek } from "../../../tests/menu-fixtures";

const query = {
    dateStr: "2026-07-21",
    place: "proctor-dining-hall",
    meal: "lunch"
};

describe("weekly upstream menus", () => {
    it("transforms all seven days and keeps venue and meal in the URL", async () => {
        const fetcher = vi.fn(async () => Response.json(menuWeek()));
        const result = await fetchWeekMenu(query, fetcher);
        expect(Object.keys(result.days)).toHaveLength(7);
        expect(result.days["2026-07-22"].sections[0].items[0].name).toBe(
            "Soup"
        );
        expect(fetcher.mock.calls[0]).toEqual(
            expect.arrayContaining([
                expect.stringContaining(
                    "/school/proctor-dining-hall/menu-type/lunch/"
                )
            ])
        );
    });

    it("distinguishes closed, unpublished, and missing item arrays", async () => {
        const result = await fetchWeekMenu(query, async () =>
            Response.json({
                days: [
                    { date: "2026-07-21", menu_items: [] },
                    {
                        date: "2026-07-22",
                        menu_items: [],
                        has_unpublished_menus: true
                    },
                    { date: "2026-07-23" }
                ]
            })
        );
        expect(result.days["2026-07-21"].result).toBe("closed");
        expect(result.days["2026-07-22"].result).toBe("unavailable");
        expect(result.days["2026-07-23"].result).toBe("unavailable");
    });

    it.each([
        { days: "not a week" },
        { days: [{ date: "2026-07-30", menu_items: [] }] },
        { days: [{ date: "2026-07-21", menu_items: [{ bad: true }] }] },
        {
            days: [
                { date: "2026-07-21", menu_items: [] },
                { date: "2026-07-21", menu_items: [] }
            ]
        }
    ])(
        "rejects malformed data and invalid day boundaries: %j",
        async (value) => {
            await expect(
                fetchWeekMenu(query, async () => Response.json(value))
            ).rejects.toThrow();
        }
    );

    it("rejects upstream failures", async () => {
        await expect(
            fetchWeekMenu(
                query,
                async () => new Response(null, { status: 503 })
            )
        ).rejects.toThrow("503");
    });

    it("accepts Nutrislice closure notes with null IDs", async () => {
        const result = await fetchWeekMenu(query, async () =>
            Response.json({
                days: [
                    {
                        date: "2026-07-25",
                        menu_items: [
                            {
                                id: null,
                                position: 0,
                                is_section_title: false,
                                text: "Thanksgiving Break",
                                food: null,
                                menu_id: 1
                            }
                        ]
                    }
                ]
            })
        );
        expect(result.days["2026-07-25"].result).toBe("closed");
    });
});

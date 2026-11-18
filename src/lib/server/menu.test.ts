import { describe, expect, it, vi } from "vitest";
import { fetchWeekMenu } from "./menu";
import { items, menuWeek } from "../../../tests/menu-fixtures";

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

    it("requires a saved representation for a 304", async () => {
        await expect(
            fetchWeekMenu(
                query,
                async () => new Response(null, { status: 304 })
            )
        ).rejects.toThrow("304");
    });

    it("keeps valid dish details and ignores malformed optional fields", async () => {
        const photo =
            "https://api.nutrislice.com/content/asset/serve/image/jpg/428870/thumbnail2";
        const result = await fetchWeekMenu(query, async () =>
            Response.json({
                days: [
                    {
                        date: query.dateStr,
                        menu_items: [
                            items[0],
                            {
                                ...items[1],
                                food: {
                                    ...items[1].food,
                                    ingredients:
                                        " Lentils and vegetable stock. ",
                                    image_url: photo,
                                    image_alt_text: null,
                                    has_nutrition_info: true,
                                    serving_size_info: {
                                        serving_size_amount: "1",
                                        serving_size_unit: "cup"
                                    },
                                    rounded_nutrition_info: {
                                        calories: 140,
                                        g_protein: 7,
                                        g_fat: "unknown",
                                        g_fiber: null,
                                        mg_sodium: 0
                                    }
                                }
                            },
                            {
                                ...items[1],
                                id: 3,
                                food: {
                                    id: 43,
                                    name: "Rice",
                                    ingredients: 123,
                                    image_url: "https://example.com/photo.jpg",
                                    has_nutrition_info: false,
                                    rounded_nutrition_info: { calories: 0 }
                                }
                            }
                        ]
                    }
                ]
            })
        );
        const [soup, rice] = result.days[query.dateStr].sections[0].items;
        expect(soup.details).toEqual({
            ingredients: "Lentils and vegetable stock.",
            servingSize: "1 cup",
            nutrition: { calories: 140, proteinGrams: 7, sodiumMg: 0 },
            photoUrl: photo,
            photoAlt: "Soup"
        });
        expect(rice.name).toBe("Rice");
        expect(rice.details).toBeUndefined();
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

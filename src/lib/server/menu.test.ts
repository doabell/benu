import { describe, expect, it } from "vitest";
import { fetchExternalMenu } from "./menu";

describe("fetchExternalMenu", () => {
    it("includes the venue in every upstream request", async () => {
        const urls: string[] = [];
        const fetcher: typeof fetch = async (input) => {
            urls.push(String(input));
            return new Response(
                JSON.stringify({
                    days: [{ date: "2026-07-21", menu_items: [] }]
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        };

        await fetchExternalMenu(
            {
                dateStr: "2026-07-21",
                place: "proctor-dining-hall",
                meal: "lunch"
            },
            fetcher
        );
        await fetchExternalMenu(
            {
                dateStr: "2026-07-21",
                place: "ross-dining-hall",
                meal: "lunch"
            },
            fetcher
        );

        expect(urls[0]).toContain("/school/proctor-dining-hall/");
        expect(urls[1]).toContain("/school/ross-dining-hall/");
        expect(urls[0]).not.toBe(urls[1]);
    });

    it("distinguishes a closed day from an unpublished date", async () => {
        let days = [{ date: "2026-07-21", menu_items: [] }];
        const fetcher: typeof fetch = async () =>
            new Response(JSON.stringify({ days }), { status: 200 });

        const closed = await fetchExternalMenu(
            {
                dateStr: "2026-07-21",
                place: "proctor-dining-hall",
                meal: "lunch"
            },
            fetcher
        );
        days = [];
        const unavailable = await fetchExternalMenu(
            {
                dateStr: "2026-08-21",
                place: "proctor-dining-hall",
                meal: "lunch"
            },
            fetcher
        );

        expect(closed.result).toBe("closed");
        expect(closed.hasDataElsewhere).toBe(false);
        expect(unavailable.result).toBe("unavailable");
    });

    it("uses another hall with data to identify a closed hall", async () => {
        const requestedUrls: string[] = [];
        const fetcher: typeof fetch = async (input) => {
            const url = String(input);
            requestedUrls.push(url);
            const rossHasData = url.includes("/school/ross-dining-hall/");

            return new Response(
                JSON.stringify({
                    days: [
                        {
                            date: "2026-07-21",
                            menu_items: rossHasData
                                ? [
                                      {
                                          id: 1,
                                          position: 1,
                                          is_section_title: true,
                                          text: "Main",
                                          menu_id: 1
                                      },
                                      {
                                          id: 2,
                                          position: 2,
                                          is_section_title: false,
                                          text: "Soup",
                                          menu_id: 1
                                      }
                                  ]
                                : []
                        }
                    ]
                }),
                { status: 200 }
            );
        };

        const result = await fetchExternalMenu(
            {
                dateStr: "2026-07-21",
                place: "proctor-dining-hall",
                meal: "lunch"
            },
            fetcher
        );

        expect(result.result).toBe("closed");
        expect(result.hasDataElsewhere).toBe(true);
        expect(requestedUrls).toEqual(
            expect.arrayContaining([
                expect.stringContaining("/school/proctor-dining-hall/"),
                expect.stringContaining("/school/ross-dining-hall/")
            ])
        );
    });

    it("treats unpublished days as unavailable rather than closed", async () => {
        const fetcher: typeof fetch = async () =>
            new Response(
                JSON.stringify({
                    days: [
                        {
                            date: "2026-07-21",
                            has_unpublished_menus: true,
                            menu_items: []
                        }
                    ]
                }),
                { status: 200 }
            );

        const result = await fetchExternalMenu(
            {
                dateStr: "2026-07-21",
                place: "proctor-dining-hall",
                meal: "lunch"
            },
            fetcher
        );

        expect(result.result).toBe("unavailable");
    });
});

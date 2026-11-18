import { describe, expect, it } from "vitest";
import {
    countItems,
    filterSections,
    formatMenuDate,
    savedMenuAge
} from "./view";
import type { MenuSection } from "./types";

describe("menu presentation", () => {
    const sections: MenuSection[] = [
        {
            title: "Main",
            items: [
                {
                    id: 1,
                    position: 1,
                    name: "Bowl",
                    iconNames: ["Vegan", "Soy"]
                },
                { id: 2, position: 2, name: "Soup", iconNames: ["Vegan"] },
                { id: 3, position: 3, name: "Sandwich", iconNames: ["Dairy"] }
            ]
        }
    ];
    it("applies the same required and excluded labels without changing source menus", () => {
        expect(
            filterSections(sections, {
                Vegan: "only",
                Soy: "off"
            })[0].items.map((item) => item.name)
        ).toEqual(["Soup"]);
        expect(countItems(sections)).toBe(3);
        expect(
            filterSections(sections, { Dairy: "only", Vegan: "only" })
        ).toEqual([]);
        expect(countItems(filterSections(sections, {}))).toBe(3);
    });
    it("formats calendar days without drifting across time zones or year boundaries", () => {
        expect(formatMenuDate("2026-11-17", "2026-11-17")).toBe(
            "Today · Tue, Nov 17"
        );
        expect(formatMenuDate("2027-01-01", "2026-12-31")).toBe(
            "Tomorrow · Fri, Jan 1, 2027"
        );
        expect(formatMenuDate("2026-11-16", "2026-11-17")).toBe(
            "Yesterday · Mon, Nov 16"
        );
    });
    it("reports the original saved age without rounding into a future hour", () => {
        const now = Date.parse("2026-11-17T12:00:00Z");
        expect(savedMenuAge(now - 30_000, now)).toBe("Saved just now");
        expect(savedMenuAge(now - 5 * 3_600_000 - 59 * 60_000, now)).toBe(
            "Saved 5 hours ago"
        );
    });
});

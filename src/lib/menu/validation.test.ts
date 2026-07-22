import { describe, expect, it } from "vitest";
import { isValidDateString, parseMenuQuery } from "./validation";

describe("menu query validation", () => {
    it("accepts configured halls and meals", () => {
        const result = parseMenuQuery(
            new URLSearchParams({
                dateStr: "2026-07-21",
                place: "proctor-dining-hall",
                meal: "lunch"
            })
        );

        expect(result).toEqual({
            query: {
                dateStr: "2026-07-21",
                place: "proctor-dining-hall",
                meal: "lunch"
            }
        });
    });

    it("rejects impossible dates without timezone conversion", () => {
        expect(isValidDateString("2026-02-30")).toBe(false);
        expect(isValidDateString("2026-07-21")).toBe(true);
    });

    it("rejects unknown menu options", () => {
        const result = parseMenuQuery(
            new URLSearchParams({
                dateStr: "2026-07-21",
                place: "proctor-dining-hall",
                meal: "midnight-snack"
            })
        );

        expect(result).toEqual({ error: "Unknown meal" });
    });
});

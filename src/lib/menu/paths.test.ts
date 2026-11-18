import { describe, expect, it } from "vitest";
import { menuPath, selectionFromPath } from "./paths";

describe("menu URLs", () => {
    it("uses short hall names and round-trips all-hall selections", () => {
        for (const [place, slug] of [
            ["atwater-dining-hall", "atwater"],
            ["ross-dining-hall", "ross"],
            ["proctor-dining-hall", "proctor"],
            ["all", "all"]
        ]) {
            const selection = {
                place,
                meal: "breakfast",
                dateStr: "2026-11-17"
            };
            expect(menuPath(selection)).toBe(`/${slug}/breakfast/2026-11-17`);
            expect(selectionFromPath(menuPath(selection))).toEqual(selection);
            const today = { place, meal: "breakfast" };
            expect(menuPath(today)).toBe(`/${slug}/breakfast`);
            expect(selectionFromPath(menuPath(today))).toEqual(today);
        }
    });
    it("rejects invalid halls, meals, dates, and incomplete paths", () => {
        for (const path of [
            "/",
            "/ross",
            "/ross/lunch/",
            "/unknown/lunch/2026-11-17",
            "/ross/snack/2026-11-17",
            "/ross/lunch/2026-02-30",
            "/ross/lunch/2026-11-17/extra"
        ])
            expect(selectionFromPath(path)).toBeUndefined();
    });
});

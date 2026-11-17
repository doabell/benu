import { describe, expect, it } from "vitest";
import {
    campusToday,
    getMealStatus,
    getNoDataReason,
    getSuggestedMeal
} from "./schedule";

describe("dining schedule", () => {
    it("uses campus time to identify an open meal", () => {
        const status = getMealStatus(
            "proctor-dining-hall",
            new Date("2026-01-13T17:00:00.000Z")
        );

        expect(status).toEqual({
            state: "open",
            label: "Usually open",
            detail: "Should close 2 PM",
            currentMeal: "lunch"
        });
    });

    it("finds the next opening in New York time", () => {
        const status = getMealStatus(
            "proctor-dining-hall",
            new Date("2026-01-14T01:00:00.000Z")
        );

        expect(status).toEqual({
            state: "closed",
            label: "Usually closed",
            detail: "Should open 7 AM tomorrow"
        });
    });

    it("looks ahead past an Atwater weekend", () => {
        const status = getMealStatus(
            "atwater-dining-hall",
            new Date("2026-01-11T17:00:00.000Z")
        );

        expect(status).toEqual({
            state: "closed",
            label: "Usually closed",
            detail: "Should open 11 AM tomorrow"
        });
    });

    it("returns the New York date", () => {
        expect(campusToday(new Date("2026-01-14T02:00:00.000Z"))).toBe(
            "2026-01-13"
        );
    });

    it("distinguishes present, future, and past empty menus", () => {
        expect(getNoDataReason("2026-01-13", "2026-01-13")).toBe(
            "No menu has been published for this meal."
        );
        expect(getNoDataReason("2026-01-14", "2026-01-13")).toBe(
            "This menu has not been published yet."
        );
        expect(getNoDataReason("2026-01-12", "2026-01-13")).toBe(
            "No published menu is available for this date."
        );
    });

    it("uses another hall's data as a closed-day hint", () => {
        expect(getNoDataReason("2026-01-14", "2026-01-13", true)).toBe(
            "Other halls have menus for this meal."
        );
    });

    it("suggests the current or next meal in campus time", () => {
        expect(
            getSuggestedMeal(
                "proctor-dining-hall",
                new Date("2026-01-13T20:00:00Z")
            )
        ).toBe("dinner");
        expect(
            getSuggestedMeal(
                "proctor-dining-hall",
                new Date("2026-01-13T17:00:00Z")
            )
        ).toBe("lunch");
        expect(
            getSuggestedMeal(
                "atwater-dining-hall",
                new Date("2026-01-11T17:00:00Z")
            )
        ).toBe("lunch");
    });
});

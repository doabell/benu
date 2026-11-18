import { describe, expect, it } from "vitest";
import {
    campusToday,
    campusZoneLabel,
    formatCampusTime,
    getMealStatus,
    getNoDataReason,
    getSuggestedMeal,
    getRegularMealHours,
    getWeeklyMealHours,
    getDiningHoursNotes
} from "./schedule";

describe("dining schedule", () => {
    it("formats the same Eastern wall time in the requested locale", () => {
        expect(formatCampusTime(17 * 60 + 30, "en-US")).toBe("5:30 PM");
        expect(formatCampusTime(17 * 60 + 30, "en-GB")).toBe("17:30");
        expect(formatCampusTime(14 * 60, "en-GB")).toBe("14:00");
        expect(campusZoneLabel("2026-01-13")).toBe("EST");
        expect(campusZoneLabel("2026-07-21")).toBe("EDT");
        expect(
            getRegularMealHours(
                "ross-dining-hall",
                "dinner",
                "2026-07-21",
                "en-GB"
            )?.hours
        ).toBe("17:30–20:30");
    });
    it("lists continental breakfast as its own weekday row only where offered", () => {
        for (const hall of ["proctor-dining-hall", "ross-dining-hall"]) {
            expect(getWeeklyMealHours(hall)[1]).toEqual({
                label: "Continental",
                weekday: "9:30 AM–11 AM",
                weekend: "—"
            });
            expect(
                getDiningHoursNotes(hall).some((note) =>
                    note.includes("Continental")
                )
            ).toBe(false);
        }
        expect(
            getWeeklyMealHours("atwater-dining-hall").some(
                (row) => row.label === "Continental"
            )
        ).toBe(false);
        expect(getDiningHoursNotes("atwater-dining-hall")).toEqual([]);
    });
    it("uses the published Ross dinner opening time", () => {
        expect(
            getRegularMealHours("ross-dining-hall", "dinner", "2026-01-13")
        ).toEqual({ label: "Dinner", hours: "5:30 PM–8:30 PM" });
        expect(
            getRegularMealHours("ross-dining-hall", "dinner", "2026-01-11")
        ).toEqual({ label: "Dinner", hours: "5:30 PM–8:30 PM" });
    });
    it("describes the selected meal and date independently of the current meal", () => {
        expect(
            getRegularMealHours("proctor-dining-hall", "dinner", "2026-01-13")
        ).toEqual({ label: "Dinner", hours: "4:30 PM–8 PM" });
        expect(
            getRegularMealHours("ross-dining-hall", "lunch", "2026-01-11")
        ).toEqual({ label: "Brunch", hours: "11 AM–2 PM" });
        expect(
            getRegularMealHours(
                "atwater-dining-hall",
                "breakfast",
                "2026-01-13"
            )
        ).toBeUndefined();
        expect(
            getRegularMealHours("atwater-dining-hall", "lunch", "2026-01-11")
        ).toBeUndefined();
    });
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

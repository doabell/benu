import { describe, expect, it } from "vitest";
import { isUsableMenuResponse, menuPolicy, MENU_FETCHED_AT } from "./policy";
import { shiftDate, weekStart } from "./dates";

describe("menu dates and cache age", () => {
    it("uses Sunday boundaries including month, year, and DST transitions", () => {
        expect(weekStart("2026-11-17")).toBe("2026-11-15");
        expect(weekStart("2027-01-01")).toBe("2026-12-27");
        expect(shiftDate("2026-03-08", 1)).toBe("2026-03-09");
        expect(shiftDate("2026-11-01", -1)).toBe("2026-10-31");
    });

    it("expires the original fetch time regardless of Date or repeated cache writes", () => {
        const now = Date.now();
        const response = (age: number) =>
            new Response("[]", {
                headers: {
                    [MENU_FETCHED_AT]: new Date(now - age).toISOString(),
                    Date: new Date(now).toUTCString()
                }
            });
        expect(isUsableMenuResponse(response(1000), now)).toBe(true);
        expect(
            isUsableMenuResponse(
                response(menuPolicy.offlineSeconds * 1000),
                now
            )
        ).toBe(false);
        expect(isUsableMenuResponse(new Response("[]"), now)).toBe(false);
        expect(isUsableMenuResponse(response(-1000), now)).toBe(false);
    });
});

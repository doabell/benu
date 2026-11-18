import { describe, expect, it } from "vitest";
import {
    decodeMenus,
    emptyMenus,
    encodeMenus,
    isUsableMenus
} from "./daily-menus";
import { isUsableMenuResponse } from "./policy";
import { campusToday, shiftDate } from "./dates";

const date = shiftDate(campusToday(), 1);
function saved(hoursOld = 0) {
    return {
        ...emptyMenus(date),
        fetchedAt: Date.now() - hoursOld * 3_600_000
    };
}

describe("daily menu freshness", () => {
    it("expires the entire date using one original timestamp", async () => {
        const fresh = saved(23);
        expect(isUsableMenus(fresh)).toBe(true);
        const response = await encodeMenus(fresh);
        expect(isUsableMenuResponse(response, date)).toBe(true);
        expect(decodeMenus(await response.json(), date).fetchedAt).toBe(
            fresh.fetchedAt
        );
        expect(isUsableMenus(saved(25))).toBe(false);
        expect((await encodeMenus(saved(25))).status).toBe(502);
    });
    it("rejects mismatched dates and malformed menu contents", () => {
        expect(() => decodeMenus(saved(), shiftDate(date, 1))).toThrow();
        const menus = saved();
        Object.assign(menus.menus["proctor-dining-hall:lunch"], {
            sections: [{ title: "Main", items: null }]
        });
        expect(() => decodeMenus(menus, date)).toThrow();
    });
});

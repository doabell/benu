import {
    emptyMenus,
    menuSlots,
    menuSlotKey,
    type MealMenu,
    type DailyMenus
} from "../../src/lib/menu/daily-menus";
import type { MenuSection } from "../../src/lib/menu/types";

export function menusFixture(
    dateStr: string,
    sections: (place: string, meal: string) => MenuSection[],
    customize?: (menu: MealMenu, place: string, dailyMenus: DailyMenus) => void
): DailyMenus {
    const day = emptyMenus(dateStr);
    day.fetchedAt = Date.now();
    for (const slot of menuSlots) {
        const menu: MealMenu = {
            result: "ok",
            sections: sections(slot.place, slot.meal),
            hasDataElsewhere: false
        };
        customize?.(menu, slot.place, day);
        day.menus[menuSlotKey(slot.place, slot.meal)] = menu;
    }
    return day;
}

export const menuHeaders = (etag = "menus") => ({
    "Content-Type": "application/json",
    "X-Menu-Fetched-At": new Date().toISOString(),
    ETag: `"${etag}"`,
    "Cache-Control": "public, max-age=21600",
    Date: new Date().toUTCString()
});

export const soupSections = (name: string): MenuSection[] => [
    {
        title: "Main",
        items: [{ id: 1, position: 1, name, iconNames: ["Vegan"] }]
    }
];

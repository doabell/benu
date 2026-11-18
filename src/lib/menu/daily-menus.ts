import { halls } from "./data";
import {
    isUsableMenuTimestamp,
    menuLifetimeSeconds,
    MENU_FETCHED_AT
} from "./policy";
import { isValidDateString } from "./validation";
import type { MenuSection } from "./types";

export const menuSlots = halls.flatMap((hall) =>
    hall.options.map((meal) => ({ place: hall.id, meal: meal.id }))
);
export const menuSlotKey = (place: string, meal: string): string =>
    `${place}:${meal}`;

export interface MealMenu {
    result: "ok" | "closed" | "unavailable" | "error";
    sections: MenuSection[];
    hasDataElsewhere: boolean;
}
export interface DailyMenus {
    dateStr: string;
    fetchedAt: number;
    fallback: boolean;
    menus: Record<string, MealMenu>;
}
export const menusRequestUrl = (dateStr: string): string =>
    `/api/menus?${new URLSearchParams({ date: dateStr })}`;
export const emptyMenus = (dateStr: string): DailyMenus => ({
    dateStr,
    fetchedAt: 0,
    fallback: false,
    menus: Object.fromEntries(
        menuSlots.map((slot) => [
            menuSlotKey(slot.place, slot.meal),
            { result: "error", sections: [], hasDataElsewhere: false }
        ])
    )
});
export const isUsableMenus = (
    day: DailyMenus | undefined,
    now = Date.now()
): day is DailyMenus =>
    !!day &&
    isUsableMenuTimestamp(
        day.fetchedAt,
        menuLifetimeSeconds(day.dateStr, now),
        now
    );

export function decodeMenus(value: unknown, dateStr: string): DailyMenus {
    if (!value || typeof value !== "object")
        throw new Error("Invalid day response");
    const day = value as DailyMenus;
    if (
        day.dateStr !== dateStr ||
        !isValidDateString(dateStr) ||
        typeof day.fetchedAt !== "number" ||
        typeof day.fallback !== "boolean" ||
        !day.menus ||
        typeof day.menus !== "object"
    )
        throw new Error("Invalid day response");
    for (const slot of menuSlots) {
        const menu = day.menus[menuSlotKey(slot.place, slot.meal)];
        if (
            !menu ||
            !["ok", "closed", "unavailable", "error"].includes(menu.result) ||
            typeof menu.hasDataElsewhere !== "boolean" ||
            !Array.isArray(menu.sections) ||
            menu.sections.some(
                (section) =>
                    !section ||
                    typeof section.title !== "string" ||
                    !Array.isArray(section.items)
            )
        )
            throw new Error("Invalid day menu");
    }
    return day;
}

export async function encodeMenus(
    day: DailyMenus,
    initialHeaders?: HeadersInit
): Promise<Response> {
    const headers = new Headers(initialHeaders);
    headers.set("Content-Type", "application/json");
    headers.set(MENU_FETCHED_AT, new Date(day.fetchedAt).toISOString());
    const body = JSON.stringify(day);
    const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(body)
    );
    headers.set(
        "ETag",
        `"${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("")}"`
    );
    return new Response(body, {
        status: isUsableMenus(day) ? 200 : 502,
        headers
    });
}

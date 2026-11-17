import {
    MENU_CACHE_NAME,
    MENU_FETCHED_AT,
    isUsableMenuResponse
} from "./policy";
import type { MenuQuery, MenuSection } from "./types";

export interface MenuData {
    sections: MenuSection[];
    result: "ok" | "closed" | "unavailable";
    hasDataElsewhere: boolean;
    fetchedAt: number;
}

export const menuRequestUrl = (selection: MenuQuery): string =>
    `/api/menu?${new URLSearchParams({ dateStr: selection.dateStr, place: selection.place, meal: selection.meal, v: "3" })}`;

export async function readMenuResponse(response: Response): Promise<MenuData> {
    if (!isUsableMenuResponse(response))
        throw new Error("Menu response is unavailable or expired");
    const sections = (await response.json()) as MenuSection[];
    if (
        !Array.isArray(sections) ||
        sections.some(
            (section) =>
                typeof section.title !== "string" ||
                !Array.isArray(section.items)
        )
    )
        throw new Error("Invalid menu response");
    const result = response.headers.get("X-Menu-Result");
    if (result !== "ok" && result !== "closed" && result !== "unavailable")
        throw new Error("Invalid menu status");
    return {
        sections,
        result,
        hasDataElsewhere:
            response.headers.get("X-Menu-Data-Elsewhere") === "true",
        fetchedAt: Date.parse(response.headers.get(MENU_FETCHED_AT)!)
    };
}

export async function readSavedMenu(
    url: string
): Promise<MenuData | undefined> {
    try {
        if (!("caches" in window)) return;
        const cache = await caches.open(MENU_CACHE_NAME);
        const response = await cache.match(url);
        if (!response) return;
        if (!isUsableMenuResponse(response)) {
            await cache.delete(url);
            return;
        }
        return await readMenuResponse(response);
    } catch {
        return;
    }
}

// A first visit can fetch the menu before the newly installed SW controls it.
// Seed the same cache in that case, so even the first return visit is instant.
export async function saveUncontrolledMenu(
    url: string,
    response: Response
): Promise<void> {
    try {
        if (
            !("caches" in window) ||
            navigator.serviceWorker?.controller ||
            !isUsableMenuResponse(response)
        )
            return;
        const cache = await caches.open(MENU_CACHE_NAME);
        const keys = await cache.keys();
        if (keys.length >= 128) await cache.delete(keys[0]);
        await cache.put(url, response);
    } catch {
        /* Storage denial must not prevent viewing a network menu. */
    }
}

export function readPreference(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}
export function writePreference(key: string, value?: string): void {
    try {
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {
        /* Preferences are optional in private or restricted browsing. */
    }
}

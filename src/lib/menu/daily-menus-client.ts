import {
    menusRequestUrl,
    decodeMenus,
    emptyMenus,
    isUsableMenus,
    type DailyMenus
} from "./daily-menus";
import {
    MENU_CACHE_NAME,
    MENU_WORKER_HEADER,
    isUsableMenuResponse,
    menuPolicy
} from "./policy";

interface DayEntry {
    data?: DailyMenus;
    checkedAt: number;
    savedRead?: Promise<DailyMenus | undefined>;
    savedLoaded: boolean;
    pending?: Promise<DailyMenus>;
}
const days = new Map<string, DayEntry>();
function entryFor(dateStr: string): DayEntry {
    let entry = days.get(dateStr);
    if (!entry) {
        entry = { checkedAt: 0, savedLoaded: false };
        days.set(dateStr, entry);
        if (days.size > 16) days.delete(days.keys().next().value!);
    }
    return entry;
}
export const peekMenus = (dateStr: string): DailyMenus | undefined =>
    entryFor(dateStr).data;

export async function readSavedMenus(
    dateStr: string,
    reload = false
): Promise<DailyMenus | undefined> {
    const entry = entryFor(dateStr);
    if (!reload && entry.data) return entry.data;
    if (entry.savedRead) return entry.savedRead;
    if (!reload && entry.savedLoaded) return;
    entry.savedRead = (async () => {
        try {
            if (!("caches" in window)) return;
            const cache = await caches.open(MENU_CACHE_NAME);
            const response = await cache.match(menusRequestUrl(dateStr));
            if (response && isUsableMenuResponse(response)) {
                const saved = decodeMenus(await response.json(), dateStr);
                if (
                    isUsableMenus(saved) &&
                    (!entry.data || saved.fetchedAt >= entry.data.fetchedAt)
                )
                    entry.data = saved;
            }
            return entry.data;
        } catch {
            return entry.data;
        } finally {
            entry.savedLoaded = true;
            entry.savedRead = undefined;
        }
    })();
    return entry.savedRead;
}

export async function fetchMenus(
    dateStr: string,
    force = false
): Promise<DailyMenus> {
    const entry = entryFor(dateStr);
    if (entry.pending) return entry.pending;
    if (
        !force &&
        entry.data &&
        (entry.data.fetchedAt === 0 || isUsableMenus(entry.data)) &&
        Date.now() - entry.checkedAt < menuPolicy.browserSeconds * 1000
    )
        return entry.data;
    entry.pending = (async () => {
        try {
            const response = await fetch(menusRequestUrl(dateStr), {
                signal: AbortSignal.timeout(15_000)
            });
            if (!response.ok) throw new Error("Day unavailable");
            const copy = response.clone();
            const next = decodeMenus(await response.json(), dateStr);
            if (!isUsableMenus(next)) throw new Error("Day expired");
            if (!entry.data || next.fetchedAt >= entry.data.fetchedAt)
                entry.data = next;
            // Seed an uncontrolled first visit. The current worker marks responses
            // so the client cannot race the worker's cache writes.
            if (
                response.headers.get(MENU_WORKER_HEADER) !== "1" &&
                "caches" in window
            ) {
                void (async () => {
                    try {
                        const cache = await caches.open(MENU_CACHE_NAME);
                        const keys = await cache.keys();
                        if (keys.length >= 32) await cache.delete(keys[0]);
                        if (isUsableMenuResponse(copy))
                            await cache.put(menusRequestUrl(dateStr), copy);
                    } catch {
                        /* Offline storage is optional. */
                    }
                })();
            }
        } catch {
            entry.data = isUsableMenus(entry.data)
                ? { ...entry.data, fallback: true }
                : emptyMenus(dateStr);
        } finally {
            entry.checkedAt = Date.now();
            entry.pending = undefined;
        }
        return entry.data!;
    })();
    return entry.pending;
}

import type { MenuQuery } from "$lib/menu/types";
import type { MenuFetchResult } from "./menu";

const FRESH_FOR_MS = 5 * 60 * 1000;
const STALE_FOR_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 128;

interface CacheEntry {
    value: MenuFetchResult;
    freshUntil: number;
    staleUntil: number;
}

export type CacheStatus = "miss" | "hit" | "stale";

export const createMenuCacheKey = ({
    dateStr,
    place,
    meal
}: MenuQuery): string => JSON.stringify([dateStr, place, meal]);

const entries = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<MenuFetchResult>>();

function store(key: string, value: MenuFetchResult): void {
    if (entries.size >= MAX_ENTRIES && !entries.has(key)) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey) entries.delete(oldestKey);
    }

    const now = Date.now();
    entries.set(key, {
        value,
        freshUntil: now + FRESH_FOR_MS,
        staleUntil: now + STALE_FOR_MS
    });
}

function refresh(
    key: string,
    loader: () => Promise<MenuFetchResult>
): Promise<MenuFetchResult> {
    const existing = inFlight.get(key);
    if (existing) return existing;

    const request = loader()
        .then((value) => {
            store(key, value);
            return value;
        })
        .finally(() => inFlight.delete(key));

    inFlight.set(key, request);
    return request;
}

export async function getCachedMenu(
    key: string,
    loader: () => Promise<MenuFetchResult>
): Promise<{ value: MenuFetchResult; status: CacheStatus }> {
    const entry = entries.get(key);
    const now = Date.now();

    if (entry && entry.freshUntil > now) {
        return { value: entry.value, status: "hit" };
    }

    if (entry && entry.staleUntil > now) {
        void refresh(key, loader).catch(() => undefined);
        return { value: entry.value, status: "stale" };
    }

    return { value: await refresh(key, loader), status: "miss" };
}

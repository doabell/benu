import { weekStart } from "../menu/dates";
import {
    isUsableMenuTimestamp,
    menuLifetimeSeconds,
    menuPolicy
} from "../menu/policy";
import type { MenuQuery } from "../menu/types";
import { fetchWeekMenu, type WeekMenu } from "./menu";

export type MenuStore = Pick<KVNamespace, "get" | "put">;
export interface WeekSnapshot extends WeekMenu {
    version: 1;
    fetchedAt: number;
    retryAfter?: number;
}
export type CacheStatus = "miss" | "hit" | "stale";
export interface SnapshotResult {
    snapshot: WeekSnapshot;
    status: CacheStatus;
    refreshError?: unknown;
}

export const createMenuCacheKey = ({
    dateStr,
    place,
    meal
}: MenuQuery): string => `week-v1:${place}:${meal}:${weekStart(dateStr)}`;

// Dedupe fetches, not cache decisions: requests for the same week can
// have different freshness requirements depending on the selected day.
const inFlight = new WeakMap<MenuStore, Map<string, Promise<SnapshotResult>>>();

export async function getWeekSnapshot(
    query: MenuQuery,
    store: MenuStore,
    fetcher: typeof fetch = fetch,
    force = false
): Promise<SnapshotResult> {
    const key = createMenuCacheKey(query);
    const stored = await store.get<WeekSnapshot>(key, "json");
    const saved = stored?.version === 1 ? stored : null;
    const now = Date.now();
    const fallback =
        saved &&
        isUsableMenuTimestamp(saved.fetchedAt, menuPolicy.offlineSeconds, now)
            ? saved
            : null;
    if (!force && saved) {
        if (fallback && now - saved.fetchedAt < menuPolicy.refreshMs)
            return { snapshot: saved, status: "hit" };
        const result = saved.days[query.dateStr]?.result;
        const lifetime = menuLifetimeSeconds(query.dateStr, now);
        // Published past menus and confirmed closures can be used for a year.
        if (
            lifetime === menuPolicy.archiveSeconds &&
            (result === "ok" || result === "closed") &&
            isUsableMenuTimestamp(saved.fetchedAt, lifetime, now)
        )
            return { snapshot: saved, status: "hit" };
        if (fallback?.retryAfter && fallback.retryAfter > now)
            return { snapshot: fallback, status: "stale" };
    }

    let pending = inFlight.get(store);
    if (!pending) {
        pending = new Map();
        inFlight.set(store, pending);
    }
    const existing = pending.get(key);
    if (existing) return existing;
    const request = refreshWeek(
        query,
        key,
        store,
        fetcher,
        saved,
        fallback
    ).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
}

async function refreshWeek(
    query: MenuQuery,
    key: string,
    store: MenuStore,
    fetcher: typeof fetch,
    saved: WeekSnapshot | null,
    fallback: WeekSnapshot | null
): Promise<SnapshotResult> {
    try {
        const menu = await fetchWeekMenu(
            { ...query, dateStr: weekStart(query.dateStr) },
            fetcher,
            saved ?? undefined
        );
        if (
            !Object.keys(menu.days).length &&
            saved &&
            Object.keys(saved.days).length
        )
            throw new Error(
                "Nutrislice returned an empty week over a saved menu"
            );
        const snapshot: WeekSnapshot = {
            ...menu,
            version: 1,
            // A successful 304 also confirms that the saved week is current.
            fetchedAt: Date.now()
        };
        await store.put(key, JSON.stringify(snapshot), {
            expirationTtl: menuPolicy.archiveSeconds
        });
        return { snapshot, status: "miss" };
    } catch (error) {
        if (!fallback) throw error;
        // Back off without extending the age or lifetime of the last good data.
        const snapshot = { ...fallback, retryAfter: Date.now() + 5 * 60_000 };
        await store
            .put(key, JSON.stringify(snapshot), {
                expirationTtl: Math.max(
                    60,
                    Math.ceil(
                        (fallback.fetchedAt +
                            menuPolicy.archiveSeconds * 1000 -
                            Date.now()) /
                            1000
                    )
                )
            })
            .catch(() => undefined);
        return { snapshot, status: "stale", refreshError: error };
    }
}

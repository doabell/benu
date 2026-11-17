import { halls } from "../menu/data";
import { weekStart } from "../menu/dates";
import { menuPolicy } from "../menu/policy";
import type { MenuQuery } from "../menu/types";
import {
    fetchWeekMenu,
    unavailableMenu,
    type MenuFetchResult,
    type WeekMenu
} from "./menu";

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
}

export const createMenuCacheKey = ({
    dateStr,
    place,
    meal
}: MenuQuery): string => `week-v1:${place}:${meal}:${weekStart(dateStr)}`;

// Only request deduplication is instance-local. The snapshots live in KV,
// including during development (Wrangler/Miniflare supplies the binding).
const inFlight = new WeakMap<MenuStore, Map<string, Promise<SnapshotResult>>>();

export function getWeekSnapshot(
    query: MenuQuery,
    store: MenuStore,
    fetcher: typeof fetch = fetch,
    force = false
): Promise<SnapshotResult> {
    const key = createMenuCacheKey(query);
    let pending = inFlight.get(store);
    if (!pending) {
        pending = new Map();
        inFlight.set(store, pending);
    }
    const existing = pending.get(key);
    if (existing) return existing;
    const request = loadWeek(query, store, fetcher, force).finally(() =>
        pending.delete(key)
    );
    pending.set(key, request);
    return request;
}

async function loadWeek(
    query: MenuQuery,
    store: MenuStore,
    fetcher: typeof fetch,
    force: boolean
): Promise<SnapshotResult> {
    const key = createMenuCacheKey(query);
    const saved = await store.get<WeekSnapshot>(key, "json");
    const now = Date.now();
    const usable =
        saved?.version === 1 &&
        saved.fetchedAt <= now &&
        now - saved.fetchedAt < menuPolicy.offlineSeconds * 1000;
    const old = usable ? saved : null;
    if (!force && old && now - old.fetchedAt < menuPolicy.refreshMs)
        return { snapshot: old, status: "hit" };
    if (!force && old?.retryAfter && old.retryAfter > now)
        return { snapshot: old, status: "stale" };

    try {
        const menu = await fetchWeekMenu(
            { ...query, dateStr: weekStart(query.dateStr) },
            fetcher
        );
        if (
            !Object.keys(menu.days).length &&
            old &&
            Object.keys(old.days).length
        )
            throw new Error(
                "Nutrislice returned an empty week over a saved menu"
            );
        const snapshot: WeekSnapshot = {
            ...menu,
            version: 1,
            fetchedAt: Date.now()
        };
        await store.put(key, JSON.stringify(snapshot), {
            expirationTtl: menuPolicy.offlineSeconds
        });
        return { snapshot, status: "miss" };
    } catch (error) {
        if (!old) throw error;
        // Back off without extending the age or lifetime of the last good data.
        const snapshot = { ...old, retryAfter: Date.now() + 5 * 60_000 };
        await store
            .put(key, JSON.stringify(snapshot), {
                expirationTtl: Math.max(
                    60,
                    Math.ceil(
                        (old.fetchedAt +
                            menuPolicy.offlineSeconds * 1000 -
                            Date.now()) /
                            1000
                    )
                )
            })
            .catch(() => undefined);
        return { snapshot, status: "stale" };
    }
}

export async function getCachedMenu(
    query: MenuQuery,
    store: MenuStore,
    fetcher: typeof fetch = fetch
): Promise<{
    value: MenuFetchResult;
    status: CacheStatus;
    fetchedAt: number;
}> {
    const { snapshot, status } = await getWeekSnapshot(query, store, fetcher);
    const value = snapshot.days[query.dateStr] ?? unavailableMenu();
    if (value.result === "ok")
        return { value, status, fetchedAt: snapshot.fetchedAt };
    const others = halls.filter(
        (hall) =>
            hall.id !== query.place &&
            hall.options.some((option) => option.id === query.meal)
    );
    const results = await Promise.all(
        others.map(async (hall) => {
            try {
                const { snapshot } = await getWeekSnapshot(
                    { ...query, place: hall.id },
                    store,
                    fetcher
                );
                return snapshot.days[query.dateStr]?.result === "ok";
            } catch {
                return false;
            }
        })
    );
    return {
        value: { ...value, hasDataElsewhere: results.some(Boolean) },
        status,
        fetchedAt: snapshot.fetchedAt
    };
}

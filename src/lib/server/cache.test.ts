import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from "vitest";
import { Miniflare } from "miniflare";
import {
    createMenuCacheKey,
    getWeekSnapshot,
    type MenuStore,
    type WeekSnapshot
} from "./cache";
import { refreshMenus } from "./refresh";
import { menuPolicy } from "../menu/policy";
import { weekForUrl } from "../../../tests/menu-fixtures";

const query = {
    dateStr: "2026-07-21",
    place: "proctor-dining-hall",
    meal: "lunch"
};
const good = {
    sections: [
        { title: "Main", items: [{ id: 1, position: 1, name: "Saved soup" }] }
    ],
    result: "ok" as const
};
let mf: Miniflare;
let kv: Awaited<ReturnType<Miniflare["getKVNamespace"]>>;
let store: MenuStore;

beforeAll(async () => {
    mf = new Miniflare({
        modules: true,
        script: "export default { fetch() { return new Response('ok'); } }",
        kvNamespaces: ["MENU_SNAPSHOTS"],
        compatibilityDate: "2026-07-21"
    });
    kv = await mf.getKVNamespace("MENU_SNAPSHOTS");
    store = kv as unknown as MenuStore;
});
beforeEach(async () => {
    const { keys } = await kv.list();
    await Promise.all(keys.map((key) => kv.delete(key.name)));
});
afterAll(async () => {
    await mf?.dispose();
});

async function seed(age: number) {
    const snapshot: WeekSnapshot = {
        version: 1,
        days: { [query.dateStr]: good },
        fetchedAt: Date.now() - age
    };
    await kv.put(createMenuCacheKey(query), JSON.stringify(snapshot));
    return snapshot;
}

describe("weekly snapshots using real local KV", () => {
    it("deduplicates concurrent requests for different dates in the same week", async () => {
        const fetcher = vi.fn(async (input: RequestInfo | URL) =>
            Response.json(weekForUrl(input))
        );
        const [first, second] = await Promise.all([
            getWeekSnapshot(query, store, fetcher),
            getWeekSnapshot({ ...query, dateStr: "2026-07-22" }, store, fetcher)
        ]);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(first.snapshot.days[query.dateStr].result).toBe("ok");
        expect(second.snapshot.days["2026-07-22"].sections).toEqual(
            first.snapshot.days[query.dateStr].sections
        );
        await getWeekSnapshot(query, store, fetcher);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("keeps halls and meals separate", async () => {
        expect(createMenuCacheKey(query)).not.toBe(
            createMenuCacheKey({ ...query, place: "ross-dining-hall" })
        );
        expect(createMenuCacheKey(query)).not.toBe(
            createMenuCacheKey({ ...query, meal: "dinner" })
        );
    });

    it("keeps the original timestamp on failure and backs off repeated requests", async () => {
        const saved = await seed(menuPolicy.refreshMs + 1000);
        const fetcher = vi.fn(async () => new Response(null, { status: 503 }));
        const result = await getWeekSnapshot(query, store, fetcher);
        expect(result).toMatchObject({
            status: "stale",
            snapshot: {
                days: { [query.dateStr]: good },
                fetchedAt: saved.fetchedAt
            }
        });
        await getWeekSnapshot(query, store, fetcher);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(
            (await store.get<WeekSnapshot>(createMenuCacheKey(query), "json"))
                ?.fetchedAt
        ).toBe(saved.fetchedAt);
    });

    it("never serves data older than the one-day limit", async () => {
        await seed(menuPolicy.offlineSeconds * 1000 + 1000);
        await expect(
            getWeekSnapshot(
                query,
                store,
                async () => new Response(null, { status: 503 })
            )
        ).rejects.toThrow();
    });

    it("does not overwrite saved menus with invalid responses", async () => {
        await seed(menuPolicy.refreshMs + 1000);
        const result = await getWeekSnapshot(query, store, async () =>
            Response.json({ days: [{ bad: true }] })
        );
        expect(result.snapshot.days[query.dateStr]).toEqual(good);
        expect(result.status).toBe("stale");
    });

    it("refreshes all sixteen weekly snapshots even if they are currently fresh", async () => {
        const fetcher = vi.fn(async (input: RequestInfo | URL) =>
            Response.json(weekForUrl(input))
        );
        await refreshMenus(store, new Date("2026-07-21T16:00:00Z"), fetcher);
        expect(fetcher).toHaveBeenCalledTimes(16);
        await getWeekSnapshot(query, store, fetcher);
        expect(fetcher).toHaveBeenCalledTimes(16);
        await refreshMenus(store, new Date("2026-07-21T16:00:00Z"), fetcher);
        expect(fetcher).toHaveBeenCalledTimes(32);
    });
});

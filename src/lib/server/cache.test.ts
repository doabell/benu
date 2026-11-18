import {
    afterAll,
    afterEach,
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
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-07-21T16:00:00Z"));
});
afterEach(() => vi.restoreAllMocks());
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

    it("does not serve today's menus beyond the one-day limit", async () => {
        await seed(menuPolicy.offlineSeconds * 1000 + 1000);
        await expect(
            getWeekSnapshot(
                query,
                store,
                async () => new Response(null, { status: 503 })
            )
        ).rejects.toThrow();
    });

    it("uses the archive for a past day while refreshing a stale menu for today in the same week", async () => {
        const past = { ...query, dateStr: "2026-07-20" };
        const saved = await seed(30 * 86_400_000);
        saved.days[past.dateStr] = good;
        await kv.put(createMenuCacheKey(query), JSON.stringify(saved));
        const fetcher = vi.fn(async (input: RequestInfo | URL) =>
            Response.json(weekForUrl(input))
        );
        const [history, live] = await Promise.all([
            getWeekSnapshot(past, store, fetcher),
            getWeekSnapshot(query, store, fetcher)
        ]);
        expect(history.status).toBe("hit");
        expect(history.snapshot.fetchedAt).toBe(saved.fetchedAt);
        expect(live.status).toBe("miss");
        expect(live.snapshot.fetchedAt).toBe(Date.now());
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("keeps a newly fetched historical week in KV for one year", async () => {
        const past = { ...query, dateStr: "2026-06-02" };
        const fetcher = vi.fn(async (input: RequestInfo | URL) =>
            Response.json(weekForUrl(input))
        );
        await getWeekSnapshot(past, store, fetcher);
        const { keys } = await kv.list({ prefix: createMenuCacheKey(past) });
        // Miniflare's runtime clock is independent of the test's Date.now.
        expect(keys[0]?.expiration).toBeGreaterThan(
            Math.floor(new Date().getTime() / 1000) +
                menuPolicy.archiveSeconds -
                60
        );
        await getWeekSnapshot(past, store, fetcher);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("does not overwrite saved menus with invalid responses", async () => {
        await seed(menuPolicy.refreshMs + 1000);
        const result = await getWeekSnapshot(query, store, async () =>
            Response.json({ days: [{ bad: true }] })
        );
        expect(result.snapshot.days[query.dateStr]).toEqual(good);
        expect(result.status).toBe("stale");
    });

    it("revalidates an unchanged week with its saved ETag and renews freshness", async () => {
        const tag = '"source-week"';
        const sourceUpdatedAt = "2026-07-20T10:00:00Z";
        const fetcher = vi.fn(
            async (input: RequestInfo | URL, init?: RequestInit) => {
                if (new Headers(init?.headers).get("If-None-Match") === tag)
                    return new Response(null, { status: 304 });
                return Response.json(
                    { ...weekForUrl(input), last_updated: sourceUpdatedAt },
                    { headers: { ETag: tag } }
                );
            }
        );
        const first = await getWeekSnapshot(query, store, fetcher);
        expect(first.snapshot.sourceEtag).toBe(tag);
        expect(
            new Headers(fetcher.mock.calls[0][1]?.headers).get("If-None-Match")
        ).toBeNull();
        const checkedAt = Date.now() + menuPolicy.refreshMs + 1_000;
        vi.mocked(Date.now).mockReturnValue(checkedAt);
        const revalidated = await getWeekSnapshot(query, store, fetcher);
        expect(
            new Headers(fetcher.mock.calls[1][1]?.headers).get("If-None-Match")
        ).toBe(tag);
        expect(revalidated.snapshot).toEqual({
            ...first.snapshot,
            fetchedAt: checkedAt
        });
        expect(revalidated.status).toBe("miss");
        expect((await getWeekSnapshot(query, store, fetcher)).status).toBe(
            "hit"
        );
        expect(fetcher).toHaveBeenCalledTimes(2);
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

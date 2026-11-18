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
import { GET } from "./+server";
import { weekForUrl } from "../../../../tests/menu-fixtures";
import { menuSlots, decodeMenus } from "$lib/menu/daily-menus";
import { createMenuCacheKey } from "$lib/server/cache";

let mf: Miniflare;
let kv: Awaited<ReturnType<Miniflare["getKVNamespace"]>>;
beforeAll(async () => {
    mf = new Miniflare({
        modules: true,
        script: "export default { fetch() { return new Response('ok'); } }",
        kvNamespaces: ["MENU_SNAPSHOTS"]
    });
    kv = await mf.getKVNamespace("MENU_SNAPSHOTS");
});
beforeEach(async () => {
    await Promise.all((await kv.list()).keys.map((key) => kv.delete(key.name)));
});
afterAll(async () => {
    await mf?.dispose();
});

const live = async (input: RequestInfo | URL) =>
    Response.json(weekForUrl(input));
async function requestMenus(
    dateStr = "2026-07-21",
    fetcher: typeof fetch = live,
    headers?: HeadersInit,
    store: unknown = kv
) {
    const request = new Request(`https://benu.test/api/menus?date=${dateStr}`, {
        headers
    });
    return GET({
        request,
        url: new URL(request.url),
        platform: { env: { MENU_SNAPSHOTS: store } },
        fetch: fetcher
    } as unknown as Parameters<typeof GET>[0]);
}

describe("daily menu API", () => {
    it("returns all eight supported slots, reuses weekly snapshots, and supports conditional HTTP caching", async () => {
        const fetcher = vi.fn(live);
        const response = await requestMenus(undefined, fetcher);
        expect(response.status).toBe(200);
        const day = decodeMenus(await response.json(), "2026-07-21");
        expect(Object.keys(day.menus)).toHaveLength(8);
        expect(day.menus["atwater-dining-hall:breakfast"]).toBeUndefined();
        expect(Object.values(day.menus)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    result: "ok",
                    sections: [
                        {
                            title: "Main",
                            items: [expect.objectContaining({ name: "Soup" })]
                        }
                    ]
                })
            ])
        );
        expect(fetcher).toHaveBeenCalledTimes(8);
        expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=21600, s-maxage=0, must-revalidate"
        );
        expect(
            (
                await requestMenus(undefined, fetcher, {
                    "If-None-Match": response.headers.get("ETag")!
                })
            ).status
        ).toBe(304);
        await requestMenus("2026-07-22", fetcher);
        expect(fetcher).toHaveBeenCalledTimes(8);
    });

    it("reads each snapshot once even when deriving other-hall availability", async () => {
        await requestMenus();
        const get = vi.fn(kv.get.bind(kv));
        const store = { get, put: kv.put.bind(kv) };
        const slot = menuSlots[0];
        const key = createMenuCacheKey({ ...slot, dateStr: "2026-07-21" });
        const snapshot = (await kv.get(key, "json")) as {
            days: Record<string, unknown>;
        };
        snapshot.days["2026-07-21"] = {
            result: "unavailable",
            sections: [],
            hasDataElsewhere: false
        };
        await kv.put(key, JSON.stringify(snapshot));
        const response = await requestMenus(undefined, live, undefined, store);
        expect(get).toHaveBeenCalledTimes(8);
        expect(
            decodeMenus(await response.json(), "2026-07-21").menus[
                `${slot.place}:${slot.meal}`
            ].hasDataElsewhere
        ).toBe(true);
    });

    it("isolates a failed slot and prevents caching a partial response as fresh", async () => {
        const response = await requestMenus(undefined, async (input) =>
            String(input).includes("atwater-dining-hall/menu-type/lunch/")
                ? new Response("Unavailable", { status: 503 })
                : live(input)
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toContain("max-age=0");
        const day = decodeMenus(await response.json(), "2026-07-21");
        expect(day.menus["atwater-dining-hall:lunch"].result).toBe("error");
        expect(day.menus["ross-dining-hall:lunch"].result).toBe("ok");
    });

    it("does not cache invalid dates, missing bindings, or a total upstream outage", async () => {
        for (const response of [
            await requestMenus("bad-date"),
            await requestMenus(undefined, live, undefined, null),
            await requestMenus(
                undefined,
                async () => new Response("Unavailable", { status: 503 })
            )
        ]) {
            expect([400, 502]).toContain(response.status);
            expect(response.headers.get("Cache-Control")).toBe("no-store");
        }
    });

    it("uses one original age for the date based on the oldest contributing snapshot", async () => {
        await requestMenus();
        const key = createMenuCacheKey({
            ...menuSlots[0],
            dateStr: "2026-07-21"
        });
        const snapshot = (await kv.get(key, "json")) as Record<string, unknown>;
        snapshot.fetchedAt = Date.now() - 7 * 3_600_000;
        snapshot.retryAfter = Date.now() + 60_000;
        await kv.put(key, JSON.stringify(snapshot));
        const response = await requestMenus();
        const dailyMenus = decodeMenus(await response.json(), "2026-07-21");
        expect(dailyMenus.fetchedAt).toBe(snapshot.fetchedAt);
        expect(dailyMenus.fallback).toBe(true);
        for (const menu of Object.values(dailyMenus.menus))
            expect(menu).not.toHaveProperty("fetchedAt");
        expect(response.headers.get("Cache-Control")).toContain("max-age=0");
    });
});

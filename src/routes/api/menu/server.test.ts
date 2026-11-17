import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Miniflare } from "miniflare";
import { GET } from "./+server";
import { weekForUrl } from "../../../../tests/menu-fixtures";

let mf: Miniflare;
let store: KVNamespace;
beforeAll(async () => {
    mf = new Miniflare({
        modules: true,
        script: "export default { fetch() { return new Response('ok'); } }",
        kvNamespaces: ["MENU_SNAPSHOTS"]
    });
    store = (await mf.getKVNamespace(
        "MENU_SNAPSHOTS"
    )) as unknown as KVNamespace;
});
afterAll(async () => {
    await mf?.dispose();
});

async function requestMenu(search: string, headers?: HeadersInit) {
    const request = new Request(`https://benu.test/api/menu?${search}`, {
        headers
    });
    return await GET({
        request,
        url: new URL(request.url),
        platform: { env: { MENU_SNAPSHOTS: store } },
        fetch: async (input: RequestInfo | URL) =>
            Response.json(weekForUrl(input))
    } as unknown as Parameters<typeof GET>[0]);
}

describe("menu HTTP caching", () => {
    it("returns source timestamps, six-hour browser caching, and conditional responses", async () => {
        const query = "dateStr=2026-07-21&place=proctor-dining-hall&meal=lunch";
        const response = await requestMenu(query);
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=21600, s-maxage=0, must-revalidate"
        );
        expect(
            Number.isFinite(
                Date.parse(response.headers.get("X-Menu-Fetched-At")!)
            )
        ).toBe(true);
        const etag = response.headers.get("ETag")!;
        expect(
            (await requestMenu(query, { "If-None-Match": etag })).status
        ).toBe(304);
        expect(await response.json()).toMatchObject([
            { items: [{ name: "Soup" }] }
        ]);
    });

    it("never caches invalid input", async () => {
        const response = await requestMenu("dateStr=not-a-date");
        expect(response.status).toBe(400);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
    });
});

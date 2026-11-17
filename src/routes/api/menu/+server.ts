import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseMenuQuery } from "$lib/menu/validation";
import { createMenuCacheKey, getCachedMenu } from "$lib/server/cache";
import { menuPolicy, MENU_FETCHED_AT } from "$lib/menu/policy";

export const GET: RequestHandler = async ({
    url,
    fetch,
    platform,
    request
}) => {
    const parsed = parseMenuQuery(url.searchParams);

    if ("error" in parsed) {
        return json(
            { error: parsed.error },
            { status: 400, headers: { "Cache-Control": "no-store" } }
        );
    }

    const { query } = parsed;
    const key = createMenuCacheKey(query);

    try {
        if (!platform?.env.MENU_SNAPSHOTS)
            throw new Error("MENU_SNAPSHOTS is not configured");
        const result = await getCachedMenu(
            query,
            platform.env.MENU_SNAPSHOTS,
            fetch
        );
        const serialized = JSON.stringify(result.value);
        const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(serialized)
        );
        const etag = `"${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
        const maxAge =
            result.status === "stale"
                ? 0
                : Math.min(
                      menuPolicy.browserSeconds,
                      Math.max(
                          0,
                          Math.floor(
                              (result.fetchedAt +
                                  menuPolicy.offlineSeconds * 1000 -
                                  Date.now()) /
                                  1000
                          )
                      )
                  );
        const headers = {
            "Cache-Control": `public, max-age=${maxAge}, s-maxage=0, must-revalidate`,
            [MENU_FETCHED_AT]: new Date(result.fetchedAt).toISOString(),
            ETag: etag,
            "X-Menu-Cache": result.status,
            "X-Menu-Cache-Key": key,
            "X-Menu-Result": result.value.result,
            "X-Menu-Data-Elsewhere": String(
                result.value.hasDataElsewhere ?? false
            )
        };
        if (request.headers.get("If-None-Match") === etag)
            return new Response(null, { status: 304, headers });
        return json(result.value.sections, { headers });
    } catch {
        return json(
            { error: "Menu unavailable" },
            { status: 502, headers: { "Cache-Control": "no-store" } }
        );
    }
};

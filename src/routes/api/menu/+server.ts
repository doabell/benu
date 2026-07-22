import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseMenuQuery } from "$lib/menu/validation";
import { createMenuCacheKey, getCachedMenu } from "$lib/server/cache";
import { fetchExternalMenu } from "$lib/server/menu";

const MENU_CACHE_CONTROL =
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export const GET: RequestHandler = async ({ url, fetch }) => {
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
        const result = await getCachedMenu(key, () =>
            fetchExternalMenu(query, fetch)
        );
        return json(result.value.sections, {
            headers: {
                "Cache-Control": MENU_CACHE_CONTROL,
                "X-Menu-Cache": result.status,
                "X-Menu-Cache-Key": key,
                "X-Menu-Result": result.value.result
            }
        });
    } catch {
        return json(
            { error: "Menu unavailable" },
            { status: 502, headers: { "Cache-Control": "no-store" } }
        );
    }
};

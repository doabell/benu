import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getCachedMenus } from "$lib/server/daily-menus";
import { encodeMenus, isUsableMenus } from "$lib/menu/daily-menus";
import { isValidDateString } from "$lib/menu/validation";
import { menuPolicy } from "$lib/menu/policy";

export const GET: RequestHandler = async ({
    url,
    platform,
    fetch,
    request
}) => {
    const dateStr = url.searchParams.get("date");
    if (!dateStr || !isValidDateString(dateStr))
        return json(
            { error: "date must be a valid YYYY-MM-DD date" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
        );
    if (!platform?.env.MENU_SNAPSHOTS)
        return json(
            { error: "Menu unavailable" },
            { status: 502, headers: { "Cache-Control": "no-store" } }
        );
    const day = await getCachedMenus(
        dateStr,
        platform.env.MENU_SNAPSHOTS,
        fetch
    );
    const now = Date.now();
    const partial = Object.values(day.menus).some(
        (menu) => menu.result === "error"
    );
    const maxAge =
        partial || day.fallback
            ? 0
            : Math.min(
                  menuPolicy.browserSeconds,
                  Math.max(
                      0,
                      Math.floor(
                          (day.fetchedAt +
                              menuPolicy.offlineSeconds * 1000 -
                              now) /
                              1000
                      )
                  )
              );
    const response = await encodeMenus(day, {
        "Cache-Control": isUsableMenus(day, now)
            ? `public, max-age=${maxAge}, s-maxage=0, must-revalidate`
            : "no-store"
    });
    if (
        response.ok &&
        request.headers.get("If-None-Match") === response.headers.get("ETag")
    )
        return new Response(null, { status: 304, headers: response.headers });
    return response;
};

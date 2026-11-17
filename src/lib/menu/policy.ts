import config from "../../../menu.config.json";

if (![1, 2, 3, 4, 6, 8, 12, 24].includes(config.refreshHours)) {
    throw new Error("refreshHours must be one of 1, 2, 3, 4, 6, 8, 12, 24");
}
if (
    !Number.isFinite(config.browserCacheHours) ||
    config.browserCacheHours <= 0 ||
    config.browserCacheHours > config.offlineHours ||
    !Number.isFinite(config.offlineHours) ||
    config.offlineHours < config.refreshHours ||
    !Number.isInteger(config.prefetchWeeks) ||
    config.prefetchWeeks < 1 ||
    config.prefetchWeeks > 2
) {
    throw new Error("Invalid menu cache policy");
}

export const menuPolicy = {
    refreshMs: config.refreshHours * 3_600_000,
    browserSeconds: config.browserCacheHours * 3600,
    offlineSeconds: config.offlineHours * 3600,
    prefetchWeeks: config.prefetchWeeks,
    cron:
        config.refreshHours === 24
            ? "0 0 * * *"
            : `0 */${config.refreshHours} * * *`
};

export const MENU_CACHE_NAME = "benu-menu-v3";
export const MENU_FETCHED_AT = "X-Menu-Fetched-At";

export function isUsableMenuResponse(
    response: Response,
    now = Date.now()
): boolean {
    const fetchedAt = Date.parse(response.headers.get(MENU_FETCHED_AT) ?? "");
    return (
        response.status === 200 &&
        Number.isFinite(fetchedAt) &&
        fetchedAt <= now &&
        now - fetchedAt < menuPolicy.offlineSeconds * 1000
    );
}

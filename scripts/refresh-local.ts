import { resolve } from "node:path";
import { getPlatformProxy } from "wrangler";
import { refreshMenus } from "../src/lib/server/refresh";
import { weekForUrl } from "../tests/menu-fixtures";

const platform = await getPlatformProxy<{ MENU_SNAPSHOTS: KVNamespace }>({
    configPath: "wrangler.jsonc",
    persist: { path: resolve(".wrangler/state/v3") },
    remoteBindings: false
});
try {
    const fetcher: typeof fetch = process.argv.includes("--fixture")
        ? async (input) => Response.json(weekForUrl(input))
        : fetch;
    await refreshMenus(platform.env.MENU_SNAPSHOTS, new Date(), fetcher);
} finally {
    await platform.dispose();
}

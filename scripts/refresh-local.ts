import { resolve } from "node:path";
import { getPlatformProxy } from "wrangler";
import { refreshMenus } from "../src/lib/server/refresh";
import { weekForUrl } from "../tests/menu-fixtures";

const platform = await getPlatformProxy<{ MENU_SNAPSHOTS: KVNamespace }>({
    configPath: "wrangler.jsonc",
    persist: { path: resolve(".wrangler/state/v3") },
    remoteBindings: false
});
const fixture = process.argv.includes("--fixture");
try {
    const fetcher: typeof fetch = fixture
        ? async (input) => Response.json(weekForUrl(input))
        : fetch;
    await refreshMenus(platform.env.MENU_SNAPSHOTS, new Date(), fetcher, {
        retryTimeouts: !fixture
    });
} finally {
    await platform.dispose();
}
process.stdout.write(
    fixture
        ? "Loaded fixture menus into local KV.\n"
        : "Refreshed Nutrislice menus in local KV.\n"
);

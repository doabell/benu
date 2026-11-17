import adapterCloudflare from "@sveltejs/adapter-cloudflare";
import { resolve } from "node:path";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        files: {
            assets: "public",
            serviceWorker: "src/sw.ts"
        },
        adapter: adapterCloudflare({
            platformProxy: {
                configPath: "wrangler.jsonc",
                persist: { path: resolve(".wrangler/state/v3") },
                remoteBindings: false
            }
        }),
        serviceWorker: { register: false }
    }
};

export default config;

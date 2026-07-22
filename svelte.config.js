import adapterAuto from "@sveltejs/adapter-auto";
import adapterCloudflare from "@sveltejs/adapter-cloudflare";
import adapterNode from "@sveltejs/adapter-node";
import adapterVercel from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const target =
    process.env.SVELTE_ADAPTER ??
    (process.env.VERCEL
        ? "vercel"
        : process.env.CF_PAGES
          ? "cloudflare"
          : "node");

const adapters = {
    auto: adapterAuto,
    cloudflare: adapterCloudflare,
    node: adapterNode,
    vercel: () => adapterVercel({ runtime: "nodejs22.x" })
};

if (!(target in adapters)) {
    throw new Error(`Unknown SVELTE_ADAPTER '${target}'`);
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        files: {
            assets: "public"
        },
        adapter: adapters[target]()
    }
};

export default config;

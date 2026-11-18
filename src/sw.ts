/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
    precacheAndRoute,
    cleanupOutdatedCaches,
    matchPrecache,
    type PrecacheEntry
} from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { BroadcastUpdatePlugin } from "workbox-broadcast-update";
import {
    MENU_CACHE_NAME,
    MENU_WORKER_HEADER,
    menuPolicy,
    isUsableMenuResponse
} from "./lib/menu/policy";

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: (PrecacheEntry | string)[];
};

void self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

const menuDate = (request: Request): string | null =>
    new URL(request.url).searchParams.get("date");

const dayCache = new StaleWhileRevalidate({
    cacheName: MENU_CACHE_NAME,
    plugins: [
        {
            async cacheWillUpdate({ request, response }) {
                return isUsableMenuResponse(response, menuDate(request))
                    ? response
                    : null;
            },
            async cachedResponseWillBeUsed({ request, cachedResponse }) {
                return cachedResponse &&
                    isUsableMenuResponse(cachedResponse, menuDate(request))
                    ? cachedResponse
                    : null;
            }
        },
        new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: menuPolicy.archiveSeconds,
            purgeOnQuotaError: true
        }),
        new BroadcastUpdatePlugin({ headersToCheck: ["ETag"] })
    ]
});
registerRoute(
    ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/menus",
    async (options) => {
        const response = await dayCache.handle(options);
        const headers = new Headers(response.headers);
        // Prevent a first-visit client cache seed from racing this worker's writes.
        headers.set(MENU_WORKER_HEADER, "1");
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    }
);

registerRoute(
    ({ request }) => request.mode === "navigate",
    new NetworkFirst({
        cacheName: "benu-documents-v1",
        networkTimeoutSeconds: 3,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 8,
                maxAgeSeconds: menuPolicy.offlineSeconds,
                purgeOnQuotaError: true
            })
        ]
    })
);
setCatchHandler(async ({ request }) =>
    request.mode === "navigate"
        ? ((await matchPrecache("/")) ?? Response.error())
        : Response.error()
);

// Navigation reaches network-first; the precached document is its offline fallback.
precacheAndRoute(self.__WB_MANIFEST, { ignoreURLParametersMatching: [] });

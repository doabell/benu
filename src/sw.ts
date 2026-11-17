/// <reference lib="webworker" />
// Keep /sw.js: existing PWA installations check this script URL for upgrades.
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
    menuPolicy,
    isUsableMenuResponse
} from "./lib/menu/policy";

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: (PrecacheEntry | string)[];
};

void self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Navigation must reach the network-first route; immutable assets are precached.
// Keep the precached document as an offline fallback without intercepting it first.

const menuCache = new StaleWhileRevalidate({
    cacheName: MENU_CACHE_NAME,
    plugins: [
        {
            async cacheWillUpdate({ response }) {
                return isUsableMenuResponse(response) ? response : null;
            },
            async cachedResponseWillBeUsed({ cachedResponse }) {
                return cachedResponse && isUsableMenuResponse(cachedResponse)
                    ? cachedResponse
                    : null;
            }
        },
        new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: menuPolicy.offlineSeconds,
            purgeOnQuotaError: true
        }),
        new BroadcastUpdatePlugin({ headersToCheck: ["ETag"] })
    ]
});
registerRoute(
    ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/menu",
    menuCache
);

registerRoute(
    ({ request }) => request.mode === "navigate",
    new NetworkFirst({
        cacheName: "benu-documents-v3",
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

// Register precaching after navigation, so the offline document cannot bypass
// the network-first navigation handler on subsequent visits.
precacheAndRoute(self.__WB_MANIFEST, { ignoreURLParametersMatching: [] });

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // Clean up the previously shipped NetworkFirst runtime caches as well.
            const obsolete = ["menu-api-v2", "documents"];
            await Promise.all(obsolete.map((name) => caches.delete(name)));
        })()
    );
});

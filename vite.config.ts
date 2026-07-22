import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        sveltekit(),
        SvelteKitPWA({
            registerType: "autoUpdate",
            includeAssets: [
                "favicon.ico",
                "favicon.svg",
                "apple-touch-icon.png"
            ],
            manifest: {
                name: "Benu",
                short_name: "Benu",
                description: "Menu, but better",
                start_url: "/",
                display: "standalone",
                background_color: "#ffffff",
                theme_color: "#1976d2",
                icons: [
                    {
                        src: "/android-chrome-192x192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "/android-chrome-512x512.png",
                        sizes: "512x512",
                        type: "image/png"
                    }
                ]
            },
            workbox: {
                navigateFallback: "/",
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) =>
                            url.pathname.startsWith("/api/menu"),
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "menu-api-v2",
                            networkTimeoutSeconds: 8,
                            expiration: {
                                maxEntries: 128,
                                maxAgeSeconds: 2 * 24 * 60 * 60
                            }
                        }
                    },
                    {
                        urlPattern: ({ request }) =>
                            request.destination === "document",
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "documents",
                            networkTimeoutSeconds: 8,
                            expiration: {
                                maxEntries: 8,
                                maxAgeSeconds: 24 * 60 * 60
                            }
                        }
                    }
                ]
            }
        })
    ]
});

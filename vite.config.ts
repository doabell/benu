import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        sveltekit(),
        SvelteKitPWA({
            registerType: "autoUpdate",
            injectRegister: false,
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.ts",
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
            injectManifest: {
                globPatterns: [
                    "client/**/*.{js,css,ico,png,svg,woff2,webmanifest}",
                    "prerendered/**/*.html"
                ]
            }
        })
    ]
});

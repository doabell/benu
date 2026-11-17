<script lang="ts">
    import { onMount } from "svelte";
    import regularFont from "@fontsource/roboto/files/roboto-latin-400-normal.woff2?url";
    import { watchTheme } from "$lib/theme";
    import "../app.css";

    let { children } = $props();

    onMount(() => {
        const cleanupTheme = watchTheme();
        if (import.meta.env.PROD && "serviceWorker" in navigator) {
            // Register on each visit; the browser checks the script for changes.
            // Updates take control without forcing the open menu to reload.
            void navigator.serviceWorker
                .register("/sw.js", { updateViaCache: "none" })
                .catch(() => undefined);
        }
        return cleanupTheme;
    });
</script>

<svelte:head>
    <title>Benu</title>
    <meta name="description" content="Menu, but better" />
    <meta name="application-name" content="Benu" />
    <meta name="apple-mobile-web-app-title" content="Benu" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="format-detection" content="telephone=no" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Benu" />
    <meta property="og:description" content="Menu, but better" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#1976d2" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link
        rel="preload"
        href={regularFont}
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
    />
</svelte:head>

{@render children()}

<script lang="ts">
    import { ModeWatcher } from "mode-watcher";
    import "../app.css";

    let { children } = $props();
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
    <link rel="manifest" href="/site.webmanifest" />
</svelte:head>

<ModeWatcher themeColors={{ dark: "#121212", light: "#ffffff" }} />
{@render children()}

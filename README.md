# Benu

> Menu, but better

Benu is a SvelteKit app that displays Middlebury dining menus. The application is built around standard web APIs so the same source can run on a Node server, Vercel functions, or Cloudflare Workers.

## Quick start

```sh
npm install
npm run dev
```

Useful checks:

```sh
npm run check
npm run lint
npm test
npm run build
```

## Deployment adapters

The adapter is selected in `svelte.config.js`:

- local builds and the Docker image use `adapter-node`;
- Vercel builds select `adapter-vercel` when `VERCEL` is set;
- Cloudflare Pages/Workers builds select `adapter-cloudflare` when `CF_PAGES` is set;
- Cloudflare Workers builds outside Pages should set `SVELTE_ADAPTER=cloudflare` before `npm run build`;
- `SVELTE_ADAPTER=auto` is available when SvelteKit's adapter detection is preferred.

The application does not call provider APIs directly. Deployments can use the response's standard `Cache-Control` headers for CDN caching.

## Caching

`GET /api/menu` uses a bounded warm-instance cache for request deduplication and stale-while-revalidate behavior. Its response headers allow a Vercel, Cloudflare, or other HTTP cache to share menu responses:

```text
public, max-age=300, s-maxage=3600, stale-while-revalidate=86400
```

The PWA service worker uses a separate per-device `NetworkFirst` cache for offline menu access.

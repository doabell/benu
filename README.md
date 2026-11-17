# Benu

> Menu, but better

Benu displays Middlebury dining menus using SvelteKit, Cloudflare Workers, and a PWA service worker. Bun manages dependencies and scripts; Cloudflare's `workerd` runs deployed code.

## Quick start

```sh
bun install --frozen-lockfile
bun run dev
```

The Cloudflare adapter automatically supplies a **local KV namespace** through Wrangler/Miniflare. Data persists in `.wrangler/state/v3` (ignored by Git), shared with Wrangler's default local development storage. Local development uses no production bindings and needs no Cloudflare login.

To warm the local cache with live menus:

```sh
bun run refresh:local
```

For deterministic development without Nutrislice access:

```sh
bun run refresh:local --fixture
```

The fixture puts a simple vegan soup on every menu in the current and following weeks. Both commands use the same local KV as the app. Local development fills expired/missing menus on access; the production scheduler is a separate Worker.

Checks:

```sh
bun run check
bun run lint
bun run test
bun run build
bunx playwright install chromium firefox
bun run test:browser
bun run test:dev
```

The server tests use actual Miniflare KV bindings. Browser checks run the production build and test cached startup, background updates, offline navigation, one-day expiry, keyboard controls, reduced motion, and accessibility. `test:dev` also checks plain-root startup, partial menu links, saved preferences, and Back navigation in Chromium and Firefox against a development server on port 5174.

## Caching

Edit `menu.config.json` to configure the policy:

| Setting             | Default | Purpose                                                                 |
| ------------------- | ------- | ----------------------------------------------------------------------- |
| `refreshHours`      | 6       | Nutrislice refresh interval; supports 1, 2, 3, 4, 6, 8, 12, or 24 hours |
| `browserCacheHours` | 6       | Browser HTTP cache freshness                                            |
| `offlineHours`      | 24      | Maximum age of a saved snapshot or offline menu                         |
| `prefetchWeeks`     | 2       | Current and following week; supports 1 or 2                             |

`bun run build` generates `.wrangler/refresh.json` from this policy and `wrangler.jsonc`. The refresh Worker and API share the same policy and KV namespace.

- One upstream request stores all seven returned dates per hall/meal. Eight hall/meal pairs across two weeks means sixteen Nutrislice requests per scheduled refresh, or 64/day with defaults.
- Requests for other dates and checks of other halls reuse those snapshots. Missing/expired weeks load on demand, with concurrent requests deduplicated within a Worker instance.
- Refresh failures retain the last successful snapshot, with a five-minute retry backoff and no extension to its original one-day lifetime.
- Browser responses are fresh for six hours and support conditional requests with ETags. Shared HTTP caching is disabled; KV supplies the shared storage without another freshness window.
- The PWA shows saved menus immediately and revalidates on access. Changed responses update the visible menu without clearing it, resetting filters, or moving scroll. There is no menu polling timer or refresh prompt.
- Both the UI and service worker enforce the original `X-Menu-Fetched-At` timestamp. Rewriting a cache entry cannot renew old data indefinitely.
- Versioned assets are precached. Documents use network-first with a precached offline fallback. A first visit without a saved menu needs a network connection.
- Service-worker updates take control automatically on a subsequent visit without forcing the open page to reload. Old runtime caches are removed during upgrade.

KV is eventually consistent, so brief cross-region differences are expected. The in-flight deduplication is per instance; KV is not a distributed lock.

## Deploy to Cloudflare Workers

The app uses Workers Static Assets and KV. No D1 database, login, dashboard, or Cloudflare Access setup is required for this scope.

```sh
bunx wrangler login
bun run verify
bun run deploy
```

On first deployment, Wrangler automatically provisions `MENU_SNAPSHOTS` for the app and writes the namespace ID into `wrangler.jsonc`. The deploy script then regenerates and deploys the scheduled refresh Worker with **that same namespace ID**. Commit the provisioned ID to make later builds deterministic. If an existing binding is resolved without being written back, copy its ID into `wrangler.jsonc` and rerun deployment.

The schedule uses UTC (`0 */6 * * *` by default), while menu dates use `America/New_York`. The API's `days[]` cover Sunday–Saturday even though its `start_date` field names Monday; cache boundaries use the returned date coverage.

For **Cloudflare Workers Builds**, connect this repository to the `benu` Worker:

| Setting           | Value                                             |
| ----------------- | ------------------------------------------------- |
| Production branch | `main`                                            |
| Bun version       | `1.4.4` (also pinned in `package.json`)           |
| Build variable    | `SKIP_DEPENDENCY_INSTALL=1`                       |
| Build command     | `bun install --frozen-lockfile && bun run verify` |
| Deploy command    | `bun run deploy`                                  |

Complete the first authenticated deployment and commit the shared KV ID before enabling automated production builds. The deploy script updates both Workers; do not create a second build integration for the refresh Worker.

For a separate branch preview environment:

```sh
bun run build
bun run deploy:preview
```

The `preview` environment provisions its own KV namespace and has no scheduled refresh Worker. Configure branch previews to use this command, never the production deploy script. Preview menus load on demand.

Deployment artifacts can be checked without publishing:

```sh
bun run deploy --dry-run
```

Likes, recommendations, wrong-menu reports, and aggregate public statistics are deferred. No owner dashboard or access gate is included.

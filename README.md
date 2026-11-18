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

The server tests use actual Miniflare KV bindings. Browser checks run the production build and test cached startup, background updates, offline navigation, one-day expiry, keyboard controls, reduced motion, and accessibility. `test:dev` checks startup, preferences, Back navigation, shared filters, independent hall failures, date-picker fallback, and keyboard skip navigation in Chromium and Firefox against a development server on port 5174.

Set `BENU_TEST_PORT` to use a different development test port if 5174 is unavailable.

## Browsing menus

Choose a hall, then a meal and date. Menu URLs use `/atwater/breakfast/2026-11-17` (or `/all/lunch/2026-11-17` for comparison). Opening `/` uses saved preferences and replaces the URL once the router is ready. One request loads the whole date: eight supported hall/meal combinations (Atwater has no breakfast). The browser decodes the response once and reuses it when switching meals or halls. **All halls** is available when the viewport is at least 72rem wide and uses equal columns with the same date and filters. Narrow screens show the last individual hall instead. A saved date supplies the offline fallback. Switching halls keeps the selected meal; a hall that does not offer it shows its available meals instead of silently changing the selection.

The filter icon between Jump to today and the theme control opens a grouped dialog. Its headings separate dietary preferences, sourcing, meat and seafood, dairy and alcohol, other allergens, and nuts. Filters cycle through neutral, required (highlighted and underlined), and excluded (struck through). Multiple required labels must all match; any excluded label removes a dish. Preferences stay on the device, and a badge on the icon shows the active count. Clear filters is available in the dialog and in an empty filtered menu. The dialog scrolls independently while its close controls remain visible.

Hours describe the selected meal's regular schedule for that date. Times always represent Eastern wall time; the browser locale chooses 12- or 24-hour formatting. The menu labels EST/EDT for its selected date, and the weekly hours dialog labels Eastern Time and keeps its top fixed when switching halls. The built-in dialog uses the same hardcoded schedule, includes continental breakfast as a row for Proctor and Ross, and links to Dining Services for exceptions. Saved-menu age appears when offline or using a fallback. A keyboard-only Skip to menu link bypasses the controls, which stay available while scrolling. Selection changes return to the pinned menu controls without revealing the brand header; Jump to today sits beside the theme control.

Date arrows have fixed tracks, including when native date entry is used. Hall and meal tabs use equal tracks, menu metadata reserves space for serving status, and loading indicators do not push content down. The footer follows the menu without a viewport-sized gap; font loading avoids late swaps while maintaining readable fallback metrics.

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
- `/api/menus?date=YYYY-MM-DD` is the only menu endpoint. It reads each weekly snapshot once and returns the selected day's menus together. In-memory results and in-flight requests are shared across hall/meal switches for six hours; the PWA keeps at most 32 saved dates.
- Refresh failures retain the last successful snapshot, with a five-minute retry backoff and no extension to its original one-day lifetime.
- Browser responses are fresh for six hours and support conditional requests with ETags. Shared HTTP caching is disabled; KV supplies the shared storage without another freshness window.
- The PWA shows saved menus immediately and revalidates on access. Changed responses update the visible menu without clearing it, resetting filters, or moving scroll. There is no menu polling timer or refresh prompt.
- The entire date has one original `fetchedAt`, taken from its oldest contributing source snapshot. The UI and service worker apply the one-day limit to that date together; cache writes cannot renew its age.
- Versioned assets are precached. Documents use network-first with a precached offline fallback. A first visit without a saved menu needs a network connection.
- Service-worker updates take control automatically on a subsequent visit without forcing the open page to reload.

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

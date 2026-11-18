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

The fixture puts a vegan soup with ingredients and nutrition on every menu in the current and following weeks. Both commands use the same local KV as the app. Local development fills expired/missing menus on access; the production scheduler is a separate Worker.

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

Choose a hall, then a meal and date. Bookmark `/` to open today with your saved preferences, or an undated route such as `/ross/lunch` to open a specific hall and meal on today's Eastern date. Choosing a different day adds the date to the URL, as in `/ross/lunch/2026-11-17`. Jump to today returns to the undated route.

One request loads the whole date: eight supported hall/meal combinations (Atwater has no breakfast). The browser decodes the response once and reuses it when switching meals or halls. **All halls** is available when the viewport is at least 72rem wide and uses equal columns with the same date and filters. Narrow screens show the last individual hall instead. A saved date supplies the offline fallback. Switching halls keeps the selected meal; a hall that does not offer it shows its available meals instead of silently changing the selection.

Select a dish row to see its listed serving size, nutrition, and ingredients when Nutrislice supplies them. Compound ingredients show their components together. Details are saved with the menu for offline use. The image icon opens a separate image search when online.

Search sits directly before Filters in the toolbar. It matches words across dish names, descriptions, ingredients, labels, serving sizes, and section headings in the selected view.

Filters groups dietary preferences, sourcing, meat and seafood, dairy and alcohol, other allergens, and nuts. Add a word or phrase in Custom filters to match dish text. Both labels and custom terms cycle through on (neutral), off (struck through), and only (highlighted and underlined). All required filters must match, and any excluded filter removes a dish. Custom terms and filter states are saved in localStorage. Clear filters resets their states and keeps the saved terms. The dialog scrolls independently while its close controls remain visible.

Hours describe the selected meal's regular schedule for that date. Times always represent Eastern wall time; the browser locale chooses 12- or 24-hour formatting. The menu labels EST/EDT for its selected date, and the weekly hours dialog labels Eastern Time and keeps its top fixed when switching halls. The built-in dialog uses the same hardcoded schedule, includes continental breakfast as a row for Proctor and Ross, and links to Dining Services for exceptions. Saved-menu age appears when offline or using a fallback. A keyboard-only Skip to menu link bypasses the controls, which stay available while scrolling. Selection changes return to the pinned menu controls without revealing the brand header; Jump to today sits beside the theme control.

Date arrows have fixed tracks, including when native date entry is used. Hall and meal tabs use equal tracks, menu metadata reserves space for serving status, and loading indicators do not push content down. The footer follows the menu without a viewport-sized gap; font loading avoids late swaps while maintaining readable fallback metrics.

## Caching

Edit `menu.config.json` to configure the policy:

| Setting             | Default | Purpose                                                                 |
| ------------------- | ------- | ----------------------------------------------------------------------- |
| `refreshHours`      | 6       | Nutrislice refresh interval; supports 1, 2, 3, 4, 6, 8, 12, or 24 hours |
| `browserCacheHours` | 6       | Browser HTTP cache freshness                                            |
| `offlineHours`      | 24      | Maximum age of a saved menu for today or a future date                  |
| `archiveDays`       | 365     | KV retention and freshness limit for past menus                         |
| `prefetchWeeks`     | 2       | Current and following week; supports 1 or 2                             |

`bun run build` generates `.wrangler/refresh.json` from this policy and `wrangler.jsonc`. The refresh Worker and API share the same policy and KV namespace.

- One upstream request stores all seven returned dates per hall/meal. Eight hall/meal pairs across two weeks means sixteen Nutrislice requests per scheduled refresh, or 64/day with defaults.
- Refreshes send the saved upstream ETag when available. Nutrislice's `304 Not Modified` confirms the saved week is current without sending or parsing another body.
- Requests for other dates and checks of other halls reuse those snapshots. After a date ends in Eastern Time, saved published menus and confirmed closures are served for up to a year from their last successful fetch without contacting Nutrislice. A historical miss fetches its week on demand. Concurrent upstream requests deduplicate within a Worker instance.
- `/api/menus?date=YYYY-MM-DD` is the only menu endpoint. It reads each weekly snapshot once and returns the selected day's menus together. In-memory results and in-flight requests are shared across hall/meal switches for six hours; the PWA keeps at most 32 saved dates.
- Refresh failures retain the last successful snapshot and use a five-minute retry backoff while it is still usable. A failed check does not reset the original fetch time or extend KV retention.
- Browser responses are fresh for six hours and support conditional requests with ETags. Shared HTTP caching is disabled; KV supplies the shared storage without another freshness window.
- The PWA shows saved menus immediately and revalidates on access. Changed responses update the visible menu without clearing it, resetting filters, or moving scroll. There is no menu polling timer or refresh prompt.
- The entire date has one original `fetchedAt`, taken from its oldest contributing source snapshot. Today and future dates expire after one day. Saved past dates use the archive limit, including offline, within the same 32-date cache.
- Versioned assets are precached. Documents use network-first with a precached offline fallback. A first visit without a saved menu needs a network connection.
- Service-worker updates take control automatically on a subsequent visit without forcing the open page to reload.

KV is eventually consistent, so brief cross-region differences are expected. The in-flight deduplication is per instance; KV is not a distributed lock.

## Deploy to Cloudflare

Production at [benu.pages.dev](https://benu.pages.dev) uses the `benu` Cloudflare Pages project. Its Git integration builds `main` and publishes `.svelte-kit/cloudflare`. In the project's production bindings, `MENU_SNAPSHOTS` points to the `BENU_CACHE` KV namespace. If setting up the project again, add that binding before deploying. The Workers configuration below supplies KV to local development and the separate refresh Worker.

```sh
bunx wrangler login
bun run deploy:refresh
```

This deploys `benu-refresh` with the namespace ID from `wrangler.jsonc`. Run it again after changing the refresh policy. The Pages app and the refresh Worker must use the same KV namespace. For a Pages preview that loads menus, bind `MENU_SNAPSHOTS` to a separate preview namespace.

The schedule uses UTC (`0 */6 * * *` by default), while menu dates use `America/New_York`. The API's `days[]` cover Sunday–Saturday even though its `start_date` field names Monday; cache boundaries use the returned date coverage.

For a standalone Workers deployment, `bun run build` and `bun run deploy` publish the app and the refresh Worker. To automate that setup with **Cloudflare Workers Builds**, connect the repository to the `benu` Worker:

| Setting           | Value                                             |
| ----------------- | ------------------------------------------------- |
| Production branch | `main`                                            |
| Bun version       | `1.4.4` (also pinned in `package.json`)           |
| Build variable    | `SKIP_DEPENDENCY_INSTALL=1`                       |
| Build command     | `bun install --frozen-lockfile && bun run verify` |
| Deploy command    | `bun run deploy`                                  |

Set the shared KV ID in `wrangler.jsonc` before enabling automated Workers builds. The deploy script updates both Workers.

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

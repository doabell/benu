<script lang="ts">
    import { onMount } from "svelte";
    import { LayoutGrid, ListFilter, Moon, Sun, WifiOff } from "@lucide/svelte";
    import { toggleMode } from "$lib/theme";
    import HallIcon from "$lib/components/HallIcon.svelte";
    import MenuPanel from "$lib/components/MenuPanel.svelte";
    import MenuSearch from "$lib/components/MenuSearch.svelte";
    import DateSelector from "$lib/components/DateSelector.svelte";
    import HoursDialog from "$lib/components/HoursDialog.svelte";
    import FilterDialog from "$lib/components/FilterDialog.svelte";
    import DishDialog from "$lib/components/DishDialog.svelte";
    import { halls } from "$lib/menu/data";
    import { campusToday } from "$lib/menu/dates";
    import { getSuggestedMeal } from "$lib/menu/schedule";
    import { isValidDateString } from "$lib/menu/validation";
    import {
        menusRequestUrl,
        isUsableMenus,
        menuSlotKey,
        type DailyMenus
    } from "$lib/menu/daily-menus";
    import { MENU_CACHE_NAME } from "$lib/menu/policy";
    import {
        peekMenus,
        readSavedMenus,
        fetchMenus
    } from "$lib/menu/daily-menus-client";
    import { readPreference, writePreference } from "$lib/menu/client";
    import {
        countItems,
        emptyMenu,
        filterNames,
        filterSections,
        isFilterState,
        nextFilterState,
        normalizeMenuText,
        parseCustomFilters,
        savedMenuAge,
        type CustomFilter,
        type FilterStates,
        type HallMenuState
    } from "$lib/menu/view";
    import { pushState } from "$app/navigation";
    import {
        menuPath,
        selectionFromPath,
        type MenuLocation
    } from "$lib/menu/paths";
    import { resolve } from "$app/paths";
    import type { MenuItem, MenuQuery } from "$lib/menu/types";

    const meals = halls[0].options;
    const filterStorageKey = "filterStates";
    const customFilterStorageKey = "customFilters";
    const mealEmojis: Record<string, string> = {
        breakfast: "🍳",
        lunch: "🥪",
        dinner: "🍽️"
    };
    let date = $state(campusToday());
    let pinnedDate = $state(false);
    let place = $state(halls[0].id);
    let meal = $state(meals[0].id);
    let menus = $state<Record<string, HallMenuState>>({});
    let loadedMenus = $state<DailyMenus>();
    let filterStates = $state<FilterStates>({});
    let customFilters = $state<CustomFilter[]>([]);
    let searchQuery = $state("");
    let online = $state(true);
    let currentTime = $state(new Date());
    let filtersOpen = $state(false);
    let ready = $state(false);
    let wide = $state(false);
    let lastHall = $state(halls[0].id);
    let controls: HTMLElement;
    let controlsAnchor: HTMLDivElement;
    let hoursDialog: { show: (hallId: string) => void };
    let filterDialog: { show: () => void };
    let dishDialog: { show: (item: MenuItem) => Promise<void> };
    let requestNumber = 0;
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- Timer handles are never rendered.
    const loadingTimers = new Map<string, number>();

    const hallsFor = (id: string) =>
        id === "all" ? halls : halls.filter((hall) => hall.id === id);
    const validPlace = (id: string | null): id is string =>
        id === "all" || halls.some((hall) => hall.id === id);
    const validMeal = (id: string | null): id is string =>
        meals.some((option) => option.id === id);
    const effectivePlace = $derived(
        place === "all" && !wide ? lastHall : place
    );
    const currentSelection = (): MenuQuery => ({
        dateStr: date,
        place: effectivePlace,
        meal
    });
    const campusDate = $derived(campusToday(currentTime));
    const canJumpToToday = $derived(pinnedDate || date !== campusDate);
    const activeHalls = $derived(hallsFor(effectivePlace));
    const hasSearch = $derived(!!normalizeMenuText(searchQuery));
    const views = $derived(
        activeHalls.map((hall) => {
            const menu = menus[hall.id] ?? emptyMenu();
            return {
                hall,
                menu,
                sections: filterSections(menu.sections, filterStates, {
                    query: searchQuery,
                    customFilters
                })
            };
        })
    );
    const activeFilterCount = $derived(
        filterNames.filter(
            (name) =>
                filterStates[name] === "off" || filterStates[name] === "only"
        ).length +
            customFilters.filter((filter) => filter.state !== "on").length
    );
    const hasActiveFilters = $derived(activeFilterCount > 0);
    const hasMenus = $derived(
        views.some((view) => view.menu.status === "ready")
    );
    const loading = $derived(views.some((view) => view.menu.loading));
    const settled = $derived(
        views.every(
            (view) =>
                view.menu.status !== "idle" && view.menu.status !== "loading"
        )
    );
    const menuAnchor = $derived.by(() => {
        const first = views.find((view) => view.sections.length > 0);
        return first ? `section-${first.hall.id}-0` : null;
    });

    function readFilterStates(): FilterStates {
        try {
            const parsed: unknown = JSON.parse(
                readPreference(filterStorageKey) ?? "{}"
            );
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
                return {};
            return Object.fromEntries(
                Object.entries(parsed).filter(
                    ([name, state]) =>
                        filterNames.includes(name) && isFilterState(state)
                )
            ) as FilterStates;
        } catch {
            return {};
        }
    }
    function preferredLocation(now: Date): MenuLocation {
        const storedPlace = readPreference("place");
        const preferredPlace = validPlace(storedPlace)
            ? storedPlace
            : halls[0].id;
        const storedMeal =
            readPreference("selectionDay") === campusToday(now)
                ? readPreference("meal")
                : null;
        return {
            place: preferredPlace,
            meal: validMeal(storedMeal)
                ? storedMeal
                : (getSuggestedMeal(
                      preferredPlace === "all" ? halls[0].id : preferredPlace,
                      now
                  ) ?? meals[0].id)
        };
    }
    function applyLocation(next: MenuLocation, now: Date): boolean {
        const nextDate = next.dateStr ?? campusToday(now);
        const nextPinned = next.dateStr !== undefined;
        const changed =
            next.place !== place ||
            next.meal !== meal ||
            nextDate !== date ||
            nextPinned !== pinnedDate;
        currentTime = now;
        place = next.place;
        if (place !== "all") lastHall = place;
        meal = next.meal;
        date = nextDate;
        pinnedDate = nextPinned;
        return changed;
    }
    function rememberSelection(selection: MenuLocation): void {
        writePreference("place", selection.place);
        writePreference("meal", selection.meal);
        writePreference("selectionDay", campusToday());
        if (selection.place !== "all")
            writePreference("singleHall", selection.place);
    }
    function displayDay(
        day: DailyMenus,
        selection: MenuQuery,
        settled = false
    ): void {
        const usable = isUsableMenus(day);
        loadedMenus = usable ? day : undefined;
        for (const hall of hallsFor(selection.place)) {
            if (!hall.options.some((option) => option.id === selection.meal))
                continue;
            const data = day.menus[menuSlotKey(hall.id, selection.meal)];
            if (usable && data.result !== "error") {
                window.clearTimeout(loadingTimers.get(hall.id));
                menus[hall.id] = {
                    sections: data.result === "ok" ? data.sections : [],
                    status:
                        data.result === "ok"
                            ? countItems(data.sections)
                                ? "ready"
                                : "unavailable"
                            : data.result,
                    loading: false,
                    hasDataElsewhere: data.hasDataElsewhere,
                    errorMessage: ""
                };
            } else if (settled) {
                window.clearTimeout(loadingTimers.get(hall.id));
                menus[hall.id] = {
                    ...emptyMenu(),
                    status: "error",
                    errorMessage: online
                        ? "Try again shortly."
                        : "Not saved for offline use."
                };
            }
        }
    }

    async function loadMenu(
        selection: MenuQuery,
        force = false
    ): Promise<void> {
        const currentRequest = ++requestNumber;
        for (const timer of loadingTimers.values()) window.clearTimeout(timer);
        loadingTimers.clear();
        loadedMenus = undefined;
        for (const hall of hallsFor(selection.place)) {
            menus[hall.id] = !hall.options.some(
                (option) => option.id === selection.meal
            )
                ? { ...emptyMenu(), status: "unsupported" }
                : emptyMenu();
        }
        const saved =
            peekMenus(selection.dateStr) ??
            (await readSavedMenus(selection.dateStr));
        if (currentRequest !== requestNumber) return;
        if (saved) displayDay(saved, selection);
        for (const hall of hallsFor(selection.place)) {
            if (menus[hall.id].status === "idle")
                loadingTimers.set(
                    hall.id,
                    window.setTimeout(() => {
                        if (currentRequest === requestNumber)
                            menus[hall.id] = {
                                ...menus[hall.id],
                                loading: true,
                                status: "loading"
                            };
                    }, 150)
                );
        }
        // A shared date request continues through meal/hall changes, then supplies
        // only the currently selected view. All eight supported slots stay decoded.
        const day = await fetchMenus(selection.dateStr, force);
        if (currentRequest === requestNumber) displayDay(day, selection, true);
    }
    function changeSelection(now = new Date()): void {
        currentTime = now;
        if (!pinnedDate) date = campusToday(now);
        const selection = currentSelection();
        place = selection.place;
        rememberSelection(selection);
        const path = menuPath({
            ...selection,
            dateStr: pinnedDate ? date : undefined
        });
        if (path !== window.location.pathname || window.location.search)
            pushState(resolve(path), {});
        void loadMenu(selection);
    }
    function prepareSelection(): void {
        // Keep the menu controls pinned when a shorter/uncached selection replaces a long menu.
        // This anchor stays in document flow, unlike the sticky controls themselves.
        const top = controlsAnchor.getBoundingClientRect().top;
        if (top < 0)
            window.scrollTo({ top: window.scrollY + top, behavior: "instant" });
    }
    function selectDate(nextDate: string, now = new Date()): void {
        const nextPinned = nextDate !== campusToday(now);
        if (
            !isValidDateString(nextDate) ||
            (nextDate === date && nextPinned === pinnedDate)
        )
            return;
        prepareSelection();
        date = nextDate;
        pinnedDate = nextPinned;
        changeSelection(now);
    }
    function jumpToToday(): void {
        const now = new Date();
        selectDate(campusToday(now), now);
    }
    function selectPlace(nextPlace: string): void {
        if (
            !validPlace(nextPlace) ||
            nextPlace === effectivePlace ||
            (nextPlace === "all" && !wide)
        )
            return;
        prepareSelection();
        place = nextPlace;
        if (nextPlace !== "all") lastHall = nextPlace;
        changeSelection();
    }
    function selectMeal(nextMeal: string): void {
        if (!validMeal(nextMeal) || nextMeal === meal) return;
        prepareSelection();
        meal = nextMeal;
        changeSelection();
    }
    function cycleFilter(name: string): void {
        filterStates = {
            ...filterStates,
            [name]: nextFilterState[filterStates[name] ?? "on"]
        };
        writePreference(filterStorageKey, JSON.stringify(filterStates));
    }
    function saveCustomFilters(filters: CustomFilter[]): void {
        customFilters = filters;
        writePreference(
            customFilterStorageKey,
            filters.length ? JSON.stringify(filters) : undefined
        );
    }
    function cycleCustomFilter(term: string): void {
        saveCustomFilters(
            customFilters.map((filter) =>
                filter.term === term
                    ? { ...filter, state: nextFilterState[filter.state] }
                    : filter
            )
        );
    }
    function resetFilters(): void {
        filterStates = {};
        writePreference(filterStorageKey);
        saveCustomFilters(
            customFilters.map((filter) => ({ ...filter, state: "on" }))
        );
    }

    onMount(() => {
        online = navigator.onLine;
        const wideLayout = window.matchMedia("(min-width: 72rem)");
        wide = wideLayout.matches;
        const storedHall = readPreference("singleHall");
        if (storedHall && halls.some((hall) => hall.id === storedHall))
            lastHall = storedHall;
        const now = new Date();
        const pathname = window.location.pathname;
        const initialLocation =
            selectionFromPath(pathname) ?? preferredLocation(now);
        // Remember the root view for Back without rewriting its bookmarkable URL.
        const rootLocation = pathname === "/" ? initialLocation : undefined;
        applyLocation(initialLocation, now);
        filterStates = readFilterStates();
        customFilters = parseCustomFilters(
            readPreference(customFilterStorageKey)
        );
        const initialSelection = currentSelection();

        const handleOnline = (): void => {
            online = true;
            void loadMenu(currentSelection(), true);
        };
        const handleOffline = (): void => {
            online = false;
        };
        const clock = window.setInterval(() => {
            currentTime = new Date();
        }, 60_000);
        const handleHistory = (): void => {
            const now = new Date();
            const pathname = window.location.pathname;
            const next =
                pathname === "/"
                    ? (rootLocation ?? preferredLocation(now))
                    : selectionFromPath(pathname);
            if (!next || !applyLocation(next, now)) return;
            rememberSelection(next);
            void loadMenu(currentSelection());
        };
        const handleMenuUpdate = async (event: MessageEvent): Promise<void> => {
            if (
                event.data?.meta !== "workbox-broadcast-update" ||
                event.data?.type !== "CACHE_UPDATED" ||
                event.data.payload?.cacheName !== MENU_CACHE_NAME
            )
                return;
            if (
                new URL(menusRequestUrl(date), window.location.origin).href !==
                event.data.payload.updatedURL
            )
                return;
            const selection = currentSelection();
            const version = requestNumber;
            const data = await readSavedMenus(date, true);
            if (data && version === requestNumber)
                displayDay(data, selection, true);
        };
        const observer = new ResizeObserver((entries) => {
            const height =
                entries[0].borderBoxSize?.[0]?.blockSize ??
                controls.getBoundingClientRect().height;
            const headerOffset =
                controlsAnchor.getBoundingClientRect().top + window.scrollY;
            document.documentElement.style.setProperty(
                "--controls-height",
                height + "px"
            );
            document.documentElement.style.setProperty(
                "--header-offset",
                headerOffset + "px"
            );
        });
        observer.observe(controls);
        const handleLayout = (): void => {
            const previousPlace = effectivePlace;
            wide = wideLayout.matches;
            if (effectivePlace !== previousPlace)
                void loadMenu(currentSelection());
        };
        wideLayout.addEventListener("change", handleLayout);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        window.addEventListener("popstate", handleHistory);
        navigator.serviceWorker?.addEventListener("message", handleMenuUpdate);
        ready = true;
        rememberSelection(initialSelection);
        void loadMenu(initialSelection);

        return () => {
            requestNumber++;
            for (const timer of loadingTimers.values())
                window.clearTimeout(timer);
            window.clearInterval(clock);
            observer.disconnect();
            wideLayout.removeEventListener("change", handleLayout);
            document.documentElement.style.removeProperty("--controls-height");
            document.documentElement.style.removeProperty("--header-offset");
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("popstate", handleHistory);
            navigator.serviceWorker?.removeEventListener(
                "message",
                handleMenuUpdate
            );
        };
    });
</script>

<svelte:head
    ><title
        >{effectivePlace === "all" ? "All halls" : activeHalls[0]?.name} · {meals.find(
            (option) => option.id === meal
        )?.name} · Benu</title
    ></svelte:head
>

<main class="app-shell">
    {#if menuAnchor}<a class="skip-link" href={`#${menuAnchor}`}>Skip to menu</a
        >{/if}
    <header class="site-header">
        <div class="brand">
            <h1>Benu</h1>
            <p class="tagline">Menu, but better</p>
        </div>
        <div class="header-actions">
            <button
                class="text-button today-button"
                class:current-day={!canJumpToToday}
                type="button"
                disabled={!ready || !canJumpToToday}
                aria-label="Jump to today"
                onclick={jumpToToday}
                ><span class="today-long">Jump to today</span><span
                    class="today-short">Today</span
                ></button
            >
            <MenuSearch
                bind:query={searchQuery}
                active={hasSearch}
                disabled={!ready}
            />
            <button
                class="icon-button filter-toggle"
                class:active={hasActiveFilters}
                type="button"
                disabled={!ready}
                aria-label="Filters"
                aria-haspopup="dialog"
                aria-expanded={filtersOpen}
                aria-controls="menu-filters"
                aria-describedby="filter-count"
                onclick={() => {
                    filterDialog.show();
                    filtersOpen = true;
                }}
            >
                <ListFilter size={20} aria-hidden="true" />
                {#if hasActiveFilters}<span
                        class="filter-badge"
                        aria-hidden="true">{activeFilterCount}</span
                    >{/if}
            </button>
            <span class="sr-only" id="filter-count"
                >{activeFilterCount} active filters</span
            >
            <button
                class="icon-button theme-toggle"
                type="button"
                disabled={!ready}
                onclick={toggleMode}
            >
                <span class="sr-only">Switch color theme to </span>
                <span class="light-mode-control"
                    ><Sun size={19} aria-hidden="true" /><span class="sr-only"
                        >Light</span
                    ></span
                >
                <span class="dark-mode-control"
                    ><Moon size={19} aria-hidden="true" /><span class="sr-only"
                        >Dark</span
                    ></span
                >
            </button>
        </div>
    </header>
    <div
        bind:this={controlsAnchor}
        class="controls-anchor"
        aria-hidden="true"
    ></div>
    <section bind:this={controls} class="controls" aria-label="Menu filters">
        <div
            class="tab-list hall-tabs"
            role="group"
            aria-label="Select dining hall"
        >
            {#each halls as hall (hall.id)}
                <button
                    class="tab-button hall-tab"
                    class:active={effectivePlace === hall.id}
                    type="button"
                    aria-pressed={effectivePlace === hall.id}
                    disabled={!ready}
                    onclick={() => selectPlace(hall.id)}
                    ><HallIcon
                        hallId={hall.id}
                        class="hall-icon"
                    />{hall.name}</button
                >
            {/each}
            <button
                class="tab-button hall-tab all-halls-tab"
                class:active={place === "all"}
                type="button"
                aria-pressed={place === "all"}
                disabled={!ready}
                onclick={() => selectPlace("all")}
                ><LayoutGrid size={17} aria-hidden="true" />All halls</button
            >
        </div>
        <div class="tab-list meal-tabs" role="group" aria-label="Select meal">
            {#each meals as option (option.id)}
                <button
                    class="tab-button meal-tab"
                    class:active={meal === option.id}
                    type="button"
                    aria-pressed={meal === option.id}
                    disabled={!ready}
                    onclick={() => selectMeal(option.id)}
                    ><span class="meal-emoji" aria-hidden="true"
                        >{mealEmojis[option.id]}</span
                    >{option.name}</button
                >
            {/each}
        </div>
        <DateSelector
            {date}
            today={campusDate}
            select={selectDate}
            disabled={!ready}
        />
    </section>
    {#if !online}<div class="offline-notice" role="status">
            <WifiOff size={17} aria-hidden="true" /><span
                >Offline · Saved menus only</span
            >
        </div>{/if}

    {#if loadedMenus && (!online || loadedMenus.fallback)}
        <p class="saved-menu-note">
            {savedMenuAge(
                loadedMenus.fetchedAt,
                currentTime.getTime()
            )}{loadedMenus.fallback && online
                ? " · Latest check unavailable"
                : ""}
        </p>
    {/if}

    <p class="sr-only" role="status">
        {hasMenus
            ? "Menu ready."
            : views.some((view) => view.menu.status === "error")
              ? "Menu unavailable."
              : ""}
    </p>
    <div
        class="hall-grid"
        class:all-halls={effectivePlace === "all"}
        aria-busy={loading}
    >
        {#if ready}{#each views as view (view.hall.id)}
                <MenuPanel
                    hall={view.hall}
                    {date}
                    {meal}
                    menu={view.menu}
                    sections={view.sections}
                    now={currentTime}
                    comparison={effectivePlace === "all"}
                    {hasActiveFilters}
                    {hasSearch}
                    clearFilters={resetFilters}
                    clearSearch={() => {
                        searchQuery = "";
                    }}
                    retry={() => void loadMenu(currentSelection(), true)}
                    {selectMeal}
                    showHours={(hallId) => hoursDialog.show(hallId)}
                    showDish={(item) => void dishDialog.show(item)}
                />
            {/each}{/if}
    </div>
    {#if settled}<footer>
            <a
                class="github-link"
                href="https://github.com/doabell/benu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View Benu on GitHub"
            >
                <svg
                    class="github-logo"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    ><path
                        fill="currentColor"
                        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.624-5.373-12-12-12"
                    /></svg
                >
            </a>
            <p class="footer-copy">
                We're no <a
                    href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    target="_blank"
                    rel="noopener noreferrer">strangers to love</a
                >.<br /><a
                    href="https://middlebury.api.nutrislice.com/terms-of-use"
                    target="_blank"
                    rel="noopener noreferrer">Nutrislice Terms of Use</a
                >
            </p>
        </footer>{/if}
</main>
<HoursDialog bind:this={hoursDialog} />
<DishDialog bind:this={dishDialog} {online} />
<FilterDialog
    bind:this={filterDialog}
    states={filterStates}
    {customFilters}
    activeCount={activeFilterCount}
    cycle={cycleFilter}
    addCustom={(term) =>
        saveCustomFilters([...customFilters, { term, state: "on" }])}
    cycleCustom={cycleCustomFilter}
    removeCustom={(term) =>
        saveCustomFilters(
            customFilters.filter((filter) => filter.term !== term)
        )}
    clear={resetFilters}
    closed={() => {
        filtersOpen = false;
    }}
/>

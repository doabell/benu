<script lang="ts">
    import { onMount } from "svelte";
    import {
        CalendarDays,
        ChevronLeft,
        ChevronRight,
        ExternalLink,
        Image as ImageIcon,
        Moon,
        Sun,
        WifiOff
    } from "@lucide/svelte";
    import { toggleMode } from "$lib/theme";
    import HallIcon from "$lib/components/HallIcon.svelte";
    import { iconMap, halls } from "$lib/menu/data";
    import {
        campusToday,
        getMealStatus,
        getSuggestedMeal,
        getNoDataReason
    } from "$lib/menu/schedule";
    import { isValidDateString } from "$lib/menu/validation";
    import { shiftDate } from "$lib/menu/dates";
    import { menuPolicy, MENU_CACHE_NAME } from "$lib/menu/policy";
    import {
        menuRequestUrl,
        readMenuResponse,
        readSavedMenu,
        saveUncontrolledMenu,
        readPreference,
        writePreference,
        type MenuData
    } from "$lib/menu/client";
    import { pushState } from "$app/navigation";
    import { resolve } from "$app/paths";
    import type { Hall, MenuSection } from "$lib/menu/types";

    interface Selection {
        dateStr: string;
        place: string;
        meal: string;
    }

    type MenuStatus =
        "idle" | "loading" | "ready" | "closed" | "unavailable" | "error";
    type FilterState = "on" | "off" | "only";

    const today = campusToday;
    const filterStorageKey = "filterStates";
    const dietaryFilterOrder = [
        "Beef",
        "Halal",
        "Alcohol",
        "Dairy",
        "Pork",
        "Vegan",
        "Vegetarian",
        "Local Ingredient",
        "Wheat",
        "Soy",
        "Milk",
        "Egg",
        "Sesame",
        "Fish",
        "Peanuts",
        "Tree Nuts",
        "Shellfish"
    ];
    const mealEmojis: Record<string, string> = {
        breakfast: "🍳",
        lunch: "🥪",
        dinner: "🍽️"
    };

    let date = $state(today());
    let place = $state(halls[0].id);
    let meal = $state(halls[0].options[0].id);
    let sections = $state<MenuSection[]>([]);
    let loading = $state(false);
    let menuStatus = $state<MenuStatus>("idle");
    let errorMessage = $state("");
    let filterStates = $state<Record<string, FilterState>>({});
    let online = $state(true);
    let currentTime = $state(new Date());
    let hasDataElsewhere = $state(false);
    let filtersExpanded = $state(false);
    let requestNumber = 0;
    let activeController: AbortController | undefined;
    let displayedUrl = "";
    let menuFetchedAt = 0;
    let loadingTimer: number | undefined;

    const isFilterState = (value: unknown): value is FilterState =>
        value === "on" || value === "off" || value === "only";

    const readFilterStates = (): Record<string, FilterState> => {
        const stored = readPreference(filterStorageKey);
        if (!stored) return {};

        try {
            const parsed: unknown = JSON.parse(stored);
            if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
            ) {
                return {};
            }

            return Object.fromEntries(
                Object.entries(parsed).filter(([, state]) =>
                    isFilterState(state)
                )
            ) as Record<string, FilterState>;
        } catch {
            return {};
        }
    };

    const saveFilterStates = (states: Record<string, FilterState>): void => {
        writePreference(filterStorageKey, JSON.stringify(states));
    };

    const selectedHall = (): Hall =>
        halls.find((hall) => hall.id === place) ?? halls[0];

    const rememberSelection = (selection: Selection): void => {
        writePreference("place", selection.place);
        writePreference("meal", selection.meal);
        writePreference("selectionDay", today());
    };

    const saveSelection = (selection: Selection): void => {
        rememberSelection(selection);
        const url = new URL(window.location.href);
        for (const [key, value] of Object.entries(selection))
            url.searchParams.set(key, value);
        if (url.href !== window.location.href) {
            pushState(
                resolve(`/?${url.searchParams.toString()}${url.hash}`),
                {}
            );
        }
    };

    const displayMenu = (data: MenuData, url: string): void => {
        displayedUrl = url;
        menuFetchedAt = data.fetchedAt;
        hasDataElsewhere = data.hasDataElsewhere;
        sections = data.result === "ok" ? data.sections : [];
        menuStatus =
            data.result === "ok"
                ? isEmptyResponse(data.sections)
                    ? "unavailable"
                    : "ready"
                : data.result;
        loading = false;
        window.clearTimeout(loadingTimer);
    };

    const loadMenu = async (selection: Selection): Promise<void> => {
        if (typeof window === "undefined") return;

        const currentRequest = ++requestNumber;
        activeController?.abort();
        activeController = new AbortController();
        window.clearTimeout(loadingTimer);
        loading = false;
        errorMessage = "";
        const url = menuRequestUrl(selection);
        let hasSaved =
            displayedUrl === url &&
            Date.now() - menuFetchedAt < menuPolicy.offlineSeconds * 1000;
        if (!hasSaved) {
            sections = [];
            menuStatus = "idle";
            hasDataElsewhere = false;
        }
        const saved = await readSavedMenu(url);
        if (currentRequest !== requestNumber) return;
        if (saved) {
            displayMenu(saved, url);
            hasSaved = true;
        }
        if (!hasSaved)
            loadingTimer = window.setTimeout(() => {
                if (currentRequest === requestNumber) {
                    loading = true;
                    menuStatus = "loading";
                }
            }, 150);

        try {
            const response = await fetch(url, {
                signal: activeController.signal
            });

            const copy = response.clone();
            const data = await readMenuResponse(response);

            if (currentRequest === requestNumber) {
                displayMenu(data, url);
                void saveUncontrolledMenu(url, copy);
            }
        } catch (error) {
            if (
                currentRequest !== requestNumber ||
                (error instanceof Error && error.name === "AbortError")
            ) {
                return;
            }

            if (hasSaved) return;
            sections = [];
            menuStatus = "error";
            errorMessage = online
                ? "Try again shortly."
                : "Not saved for offline use.";
        } finally {
            if (currentRequest === requestNumber) {
                window.clearTimeout(loadingTimer);
                loading = false;
            }
        }
    };

    const selectDate = (nextDate: string): void => {
        if (!isValidDateString(nextDate)) return;
        date = nextDate;
        const selection = { dateStr: date, place, meal };
        saveSelection(selection);
        void loadMenu(selection);
    };

    const selectPlace = (nextPlace: string): void => {
        const hall = halls.find((candidate) => candidate.id === nextPlace);
        if (!hall) return;

        place = hall.id;
        if (!hall.options.some((option) => option.id === meal))
            meal = hall.options[0].id;

        const selection = { dateStr: date, place, meal };
        saveSelection(selection);
        void loadMenu(selection);
    };

    const selectMeal = (nextMeal: string): void => {
        if (!selectedHall().options.some((option) => option.id === nextMeal))
            return;
        meal = nextMeal;
        const selection = { dateStr: date, place, meal };
        saveSelection(selection);
        void loadMenu(selection);
    };

    const currentSelection = (): Selection => ({ dateStr: date, place, meal });

    const iconLabels = (iconNames: string[] | undefined): string =>
        iconNames
            ?.map((iconName) => iconMap[iconName] ?? iconName)
            .join(", ") ?? "";

    const availability = $derived(getMealStatus(place, currentTime));
    const campusDate = $derived(campusToday(currentTime));
    const emptyMenuReason = $derived(
        getNoDataReason(date, campusDate, hasDataElsewhere)
    );
    const availableFilters = $derived.by(() => {
        const presentIcons = new Set(
            sections.flatMap((section) =>
                section.items.flatMap((item) => item.iconNames ?? [])
            )
        );
        return dietaryFilterOrder.filter(
            (filter) =>
                presentIcons.has(filter) ||
                filterStates[filter] === "off" ||
                filterStates[filter] === "only"
        );
    });

    const onlyFilters = $derived(
        availableFilters.filter((filter) => filterStates[filter] === "only")
    );
    const offFilters = $derived(
        availableFilters.filter((filter) => filterStates[filter] === "off")
    );
    const visibleSections = $derived.by(() =>
        sections
            .map((section) => ({
                ...section,
                items: section.items.filter((item) => {
                    const iconNames = item.iconNames ?? [];
                    return (
                        onlyFilters.every((filter) =>
                            iconNames.includes(filter)
                        ) &&
                        offFilters.every(
                            (filter) => !iconNames.includes(filter)
                        )
                    );
                })
            }))
            .filter((section) => section.items.length > 0)
    );

    const totalItemCount = $derived(
        sections.reduce((count, section) => count + section.items.length, 0)
    );
    const visibleItemCount = $derived(
        visibleSections.reduce(
            (count, section) => count + section.items.length,
            0
        )
    );
    const activeFilterCount = $derived(
        Object.values(filterStates).filter((state) => state !== "on").length
    );
    const hasActiveFilters = $derived(activeFilterCount > 0);
    const hasMenuFiltersApplied = $derived(
        availableFilters.some((filter) => filterStates[filter] !== "on")
    );

    const filterState = (filter: string): FilterState =>
        filterStates[filter] ?? "on";

    const filterStateLabel = (state: FilterState): string => {
        if (state === "off") return "excluded";
        if (state === "only") return "only";
        return "included";
    };

    const cycleFilter = (filter: string): void => {
        const nextState: Record<FilterState, FilterState> = {
            on: "only",
            only: "off",
            off: "on"
        };
        const nextFilterStates = {
            ...filterStates,
            [filter]: nextState[filterState(filter)]
        };
        filterStates = nextFilterStates;
        saveFilterStates(nextFilterStates);
    };

    const resetFilters = (): void => {
        filterStates = {};
        writePreference(filterStorageKey);
    };

    const isEmptyResponse = (menu: MenuSection[]): boolean =>
        menu.length === 0 ||
        ["No data", "No data available", "No menu available"].includes(
            menu[0]?.title ?? ""
        );

    onMount(() => {
        const updateOnline = (): void => {
            online = navigator.onLine;
        };
        const handleOnline = (): void => {
            online = true;
            void loadMenu(currentSelection());
        };
        const handleOffline = (): void => {
            online = false;
        };
        const clock = window.setInterval(() => {
            currentTime = new Date();
        }, 60_000);

        updateOnline();
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        const params = new URL(window.location.href).searchParams;
        const storedPlace = params.get("place") ?? readPreference("place");
        const nextPlace = halls.some((hall) => hall.id === storedPlace)
            ? storedPlace!
            : halls[0].id;
        const hall =
            halls.find((candidate) => candidate.id === nextPlace) ?? halls[0];
        const storedMeal =
            params.get("meal") ??
            (readPreference("selectionDay") === today()
                ? readPreference("meal")
                : null);
        filterStates = readFilterStates();
        filtersExpanded = window.matchMedia("(min-width: 601px)").matches;

        const requestedDate = params.get("dateStr");
        date =
            requestedDate && isValidDateString(requestedDate)
                ? requestedDate
                : today();
        place = nextPlace;
        meal = hall.options.some((option) => option.id === storedMeal)
            ? storedMeal!
            : (getSuggestedMeal(nextPlace) ?? hall.options[0].id);

        const initialSelection = currentSelection();
        const handleHistory = (): void => {
            const params = new URL(window.location.href).searchParams;
            const nextPlace =
                halls.find(
                    (hall) =>
                        hall.id ===
                        (params.get("place") ?? initialSelection.place)
                ) ?? halls[0];
            const nextDate = params.get("dateStr") ?? initialSelection.dateStr;
            date = isValidDateString(nextDate) ? nextDate : today();
            place = nextPlace.id;
            meal =
                nextPlace.options.find(
                    (option) =>
                        option.id ===
                        (params.get("meal") ?? initialSelection.meal)
                )?.id ?? nextPlace.options[0].id;
            const selection = currentSelection();
            rememberSelection(selection);
            void loadMenu(selection);
        };
        const handleMenuUpdate = async (event: MessageEvent): Promise<void> => {
            if (
                event.data?.meta !== "workbox-broadcast-update" ||
                event.data?.type !== "CACHE_UPDATED" ||
                event.data.payload?.cacheName !== MENU_CACHE_NAME
            )
                return;
            const url = menuRequestUrl(currentSelection());
            if (
                event.data.payload.updatedURL !==
                new URL(url, window.location.origin).href
            )
                return;
            const version = requestNumber;
            const data = await readSavedMenu(url);
            if (
                data &&
                version === requestNumber &&
                url === menuRequestUrl(currentSelection())
            )
                displayMenu(data, url);
        };
        window.addEventListener("popstate", handleHistory);
        navigator.serviceWorker?.addEventListener("message", handleMenuUpdate);

        // SvelteKit's router is not initialized during the initial onMount.
        // Keep this entry's URL intact; only user selections add history.
        rememberSelection(initialSelection);
        void loadMenu(initialSelection);

        return () => {
            requestNumber++;
            window.clearInterval(clock);
            window.clearTimeout(loadingTimer);
            window.removeEventListener("popstate", handleHistory);
            navigator.serviceWorker?.removeEventListener(
                "message",
                handleMenuUpdate
            );
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            activeController?.abort();
        };
    });
</script>

<main class="app-shell">
    <header class="site-header">
        <h1>Benu</h1>
        <p class="tagline">Menu, but better</p>
    </header>

    {#if !online}
        <div class="offline-notice" role="status">
            <WifiOff size={18} aria-hidden="true" />
            <span>Offline · Saved menus only</span>
        </div>
    {/if}

    <section class="controls" aria-label="Menu filters">
        <div class="tab-group">
            <span class="sr-only">Dining hall</span>
            <div class="tab-list" role="group" aria-label="Select dining hall">
                {#each halls as hall (hall.id)}
                    <button
                        class="tab-button hall-tab"
                        class:active={place === hall.id}
                        type="button"
                        aria-pressed={place === hall.id}
                        onclick={() => selectPlace(hall.id)}
                    >
                        <HallIcon hallId={hall.id} class="hall-icon" />
                        {hall.name}
                    </button>
                {/each}
            </div>
        </div>

        <div class="date-selector">
            <label class="sr-only" for="menu-date">Menu date</label>
            <button
                class="icon-button"
                type="button"
                aria-label="Previous day"
                onclick={() => selectDate(shiftDate(date, -1))}
            >
                <ChevronLeft size={19} />
            </button>
            <div class="date-input-wrap">
                <CalendarDays size={17} aria-hidden="true" />
                <input
                    id="menu-date"
                    type="date"
                    value={date}
                    onchange={(event) =>
                        selectDate(
                            (event.currentTarget as HTMLInputElement).value
                        )}
                />
            </div>
            <button
                class="icon-button"
                type="button"
                aria-label="Next day"
                onclick={() => selectDate(shiftDate(date, 1))}
            >
                <ChevronRight size={19} />
            </button>
        </div>

        <div class="tab-group">
            <span class="sr-only">Meal</span>
            <div class="tab-list" role="group" aria-label="Select meal">
                {#each selectedHall().options as option (option.id)}
                    <button
                        class="tab-button meal-tab"
                        class:active={meal === option.id}
                        type="button"
                        aria-pressed={meal === option.id}
                        onclick={() => selectMeal(option.id)}
                    >
                        <span class="meal-emoji" aria-hidden="true">
                            {mealEmojis[option.id] ?? "🍽️"}
                        </span>
                        {option.name}
                        {#if date === today() && availability.currentMeal === option.id}
                            <span class="current-label">now</span>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>
    </section>

    {#if date === today()}
        <section
            class="availability"
            class:open={availability.state === "open"}
            aria-label="Dining hall availability"
        >
            <span class="availability-dot" aria-hidden="true"></span>
            <div class="availability-copy">
                <strong>{availability.label}</strong>
                <span aria-hidden="true">·</span>
                <span>{availability.detail}</span>
            </div>
            <a
                href="https://www.middlebury.edu/dining-services/general-information"
                target="_blank"
                rel="noopener noreferrer">Hours</a
            >
        </section>
    {/if}

    {#if menuStatus === "ready" && sections.length > 0 && availableFilters.length > 0}
        <details
            class="filter-panel"
            open={filtersExpanded}
            ontoggle={(event) =>
                (filtersExpanded = (event.currentTarget as HTMLDetailsElement)
                    .open)}
        >
            <summary class="filters-summary">
                <span id="filters-heading" class="filters-heading">Filters</span
                >
                <span class="filter-status">
                    <span
                        class="filter-status-dot"
                        class:active={hasActiveFilters}
                        aria-hidden="true"
                    ></span>
                    {#if hasActiveFilters}
                        {activeFilterCount} active
                        {#if hasMenuFiltersApplied}
                            · {visibleItemCount} of {totalItemCount} items
                        {:else}
                            · no match in this menu
                        {/if}
                    {:else}
                        No filters
                    {/if}
                </span>
            </summary>
            <div class="menu-tools" aria-labelledby="filters-heading">
                <button
                    class="reset-filters"
                    type="button"
                    disabled={!hasActiveFilters}
                    onclick={resetFilters}
                >
                    Reset filters
                </button>
                <div class="filter-list" aria-label="Dietary filters">
                    {#each availableFilters as filter (filter)}
                        {@const state = filterState(filter)}
                        <button
                            class="filter-chip"
                            class:off={state === "off"}
                            class:only={state === "only"}
                            type="button"
                            aria-label={`${filter}: ${filterStateLabel(state)}`}
                            title={`${filterStateLabel(state)} — click to cycle`}
                            data-state={state}
                            onclick={() => cycleFilter(filter)}
                        >
                            {iconMap[filter] ?? filter}
                        </button>
                    {/each}
                </div>
                <p class="filter-disclaimer">
                    Dietary labels come from menu data and may be incomplete.
                    Check with Dining Services about allergens.
                </p>
            </div>
        </details>
    {/if}

    <p class="sr-only" role="status">
        {menuStatus === "ready"
            ? `Menu ready. ${visibleItemCount} items.`
            : menuStatus === "error"
              ? errorMessage
              : menuStatus === "closed"
                ? "No menu is listed for this meal."
                : menuStatus === "unavailable"
                  ? "Menu not published."
                  : ""}
    </p>
    <section class="menu-card" aria-label="Menu" aria-busy={loading}>
        {#if loading}
            <div class="loading">
                <div class="loading-copy">
                    <img
                        class="loading-logo"
                        src="/favicon.svg"
                        alt=""
                        width="28"
                        height="28"
                    />
                    <span>Loading</span>
                    <span class="loading-dots" aria-hidden="true">...</span>
                </div>
                <div class="loading-track" aria-hidden="true">
                    <span class="loading-bar"></span>
                </div>
            </div>
        {/if}

        {#each visibleSections as section (section.title)}
            <article class="menu-section">
                <h2>{section.title}</h2>
                <ul>
                    {#each section.items as item (item.id)}
                        <li class="menu-item">
                            <a
                                class="image-link"
                                href={`https://www.google.com/search?q=${encodeURIComponent(item.name ?? "Menu item")}&tbm=isch`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Search for an image of ${item.name ?? "this menu item"}`}
                            >
                                <ImageIcon size={19} />
                            </a>
                            <div>
                                <p class="item-name">
                                    {item.name ?? "Unnamed item"}
                                </p>
                                {#if item.subtext}
                                    <p class="item-subtext">{item.subtext}</p>
                                {/if}
                                {#if item.iconNames?.length}
                                    <p class="item-icons">
                                        {iconLabels(item.iconNames)}
                                    </p>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            </article>
        {/each}

        {#if menuStatus === "closed" || menuStatus === "unavailable"}
            <div class="empty-state prominent-state">
                <strong
                    >{menuStatus === "closed"
                        ? "No menu listed"
                        : "Not published"}</strong
                >
                <span>{emptyMenuReason}</span>
            </div>
        {:else if menuStatus === "error"}
            <div class="empty-state error-state">
                <strong>Menu unavailable</strong>
                <span>{errorMessage}</span>
                <button
                    class="retry-button"
                    type="button"
                    onclick={() => void loadMenu(currentSelection())}
                    >Try again</button
                >
            </div>
        {:else if menuStatus === "ready" && visibleSections.length === 0}
            <div class="empty-state">
                <strong>No matches</strong>
                <span>Adjust filters.</span>
            </div>
        {/if}
    </section>

    <div class="menu-link-wrap">
        <a
            class="menu-link"
            href={`https://middlebury.nutrislice.com/menu/${place}/${meal}/${date}`}
            target="_blank"
            rel="noreferrer"
        >
            View original menu
            <ExternalLink size={16} />
        </a>
    </div>

    <footer>
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
            >
                <path
                    fill="currentColor"
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.624-5.373-12-12-12"
                />
            </svg>
            <span class="sr-only">Benu on GitHub</span>
        </a>
        <p class="footer-copy">
            We're no
            <a
                class="footer-link"
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                rel="noopener noreferrer">strangers to love</a
            >.<br />
            <a
                class="footer-link"
                href="https://middlebury.api.nutrislice.com/terms-of-use"
                target="_blank"
                rel="noopener noreferrer">Nutrislice Terms of Use</a
            >
        </p>
    </footer>

    <div class="action-stack">
        {#if date !== today()}
            <button
                class="action-button"
                type="button"
                aria-label="Back to today"
                onclick={() => selectDate(today())}
            >
                <CalendarDays size={18} />
                Today
            </button>
        {/if}
        <button class="action-button" type="button" onclick={toggleMode}>
            <span class="sr-only">Switch color theme to </span>
            <span class="light-mode-control"><Sun size={18} />Light</span>
            <span class="dark-mode-control"><Moon size={18} />Dark</span>
        </button>
    </div>
</main>

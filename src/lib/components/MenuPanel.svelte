<script lang="ts">
    import { ExternalLink } from "@lucide/svelte";
    import HallIcon from "./HallIcon.svelte";
    import { iconMap } from "$lib/menu/data";
    import {
        campusToday,
        campusZoneLabel,
        getMealStatus,
        getNoDataReason,
        getRegularMealHours
    } from "$lib/menu/schedule";
    import type { HallMenuState } from "$lib/menu/view";
    import type { Hall, MenuItem, MenuSection } from "$lib/menu/types";

    let {
        hall,
        date,
        meal,
        menu,
        sections,
        now,
        comparison,
        hasActiveFilters,
        hasSearch,
        clearFilters,
        clearSearch,
        retry,
        selectMeal,
        showHours,
        showDish
    }: {
        hall: Hall;
        date: string;
        meal: string;
        menu: HallMenuState;
        sections: MenuSection[];
        now: Date;
        comparison: boolean;
        hasActiveFilters: boolean;
        hasSearch: boolean;
        clearFilters: () => void;
        clearSearch: () => void;
        retry: () => void;
        selectMeal: (meal: string) => void;
        showHours: (hallId: string) => void;
        showDish: (item: MenuItem) => void;
    } = $props();
    const mealName = $derived(meal.charAt(0).toUpperCase() + meal.slice(1));
    const hours = $derived(getRegularMealHours(hall.id, meal, date));
    const servingNow = $derived(
        date === campusToday(now) &&
            getMealStatus(hall.id, now).currentMeal === meal
    );
    const emptyReason = $derived(
        getNoDataReason(date, campusToday(now), menu.hasDataElsewhere)
    );
    const sectionId = (index: number): string => `section-${hall.id}-${index}`;
</script>

<section
    class="menu-card"
    class:comparison
    aria-label={comparison ? `${hall.name} menu` : "Menu"}
    aria-busy={menu.loading}
>
    {#if comparison}
        <header class="hall-heading">
            <h2><HallIcon hallId={hall.id} class="hall-icon" />{hall.name}</h2>
        </header>
    {/if}
    <div class="meal-hours">
        <span
            >{#if hours}<strong>{hours.label}</strong>
                {hours.hours}<span class="hours-note"
                    >&nbsp;{campusZoneLabel(date)}</span
                >{:else}No regular {mealName.toLowerCase()} hours{/if}</span
        >
        {#if servingNow}<span class="serving-now">Usually serving now</span
            >{/if}
        <button
            class="hours-button"
            type="button"
            aria-label={`View ${hall.name} dining hours`}
            onclick={() => showHours(hall.id)}>Hours</button
        >
    </div>
    <div class="menu-content">
        {#if menu.loading}<div class="loading" role="status">
                <span>Loading</span>
                <div class="loading-track" aria-hidden="true">
                    <span class="loading-bar"></span>
                </div>
            </div>{/if}
        <div class="menu-sections">
            {#each sections as section, index (section.title)}
                <article class="menu-section">
                    <svelte:element
                        this={comparison ? "h3" : "h2"}
                        id={sectionId(index)}
                        tabindex="-1">{section.title}</svelte:element
                    >
                    <ul role="list">
                        {#each section.items as item (item.id)}
                            {@const name = item.name ?? "Unnamed item"}
                            {@const nameId = `${sectionId(index)}-item-${item.id}`}
                            {@const detailsId =
                                item.subtext || item.iconNames?.length
                                    ? `${nameId}-details`
                                    : undefined}
                            <li class="menu-item">
                                <button
                                    class="dish-row"
                                    type="button"
                                    aria-haspopup="dialog"
                                    aria-controls="dish-details"
                                    aria-labelledby={nameId}
                                    aria-describedby={detailsId}
                                    onclick={() => showDish(item)}
                                >
                                    <span class="item-name" id={nameId}
                                        >{name}</span
                                    >
                                    {#if detailsId}
                                        <span id={detailsId}>
                                            {#if item.subtext}<span
                                                    class="item-subtext"
                                                    >{item.subtext}</span
                                                >{/if}
                                            {#if item.iconNames?.length}
                                                <span class="item-icons">
                                                    {#each item.iconNames as label (label)}
                                                        <span
                                                            class="item-label"
                                                        >
                                                            {#if iconMap[label]}
                                                                <span
                                                                    class="label-pictogram"
                                                                    aria-hidden="true"
                                                                    >{iconMap[
                                                                        label
                                                                    ].slice(
                                                                        0,
                                                                        -label.length
                                                                    )}</span
                                                                >
                                                            {/if}
                                                            {label}
                                                        </span>
                                                    {/each}
                                                </span>
                                            {/if}
                                        </span>
                                    {/if}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </article>
            {/each}
        </div>
        {#if menu.status === "unsupported"}
            <div class="empty-state">
                <strong>{mealName} isn’t served here</strong><span
                    >{hall.name} offers {hall.options
                        .map((option) => option.name.toLowerCase())
                        .join(" and ")}.</span
                >
                <div class="empty-actions">
                    {#each hall.options as option (option.id)}<button
                            class="text-button"
                            type="button"
                            onclick={() => selectMeal(option.id)}
                            >View {option.name.toLowerCase()}</button
                        >{/each}
                </div>
            </div>
        {:else if menu.status === "closed" || menu.status === "unavailable"}
            <div class="empty-state">
                <strong
                    >{menu.status === "closed"
                        ? "No menu listed"
                        : "Not published"}</strong
                ><span>{emptyReason}</span>
            </div>
        {:else if menu.status === "error"}
            <div class="empty-state">
                <strong>Menu unavailable</strong><span>{menu.errorMessage}</span
                ><button class="text-button" type="button" onclick={retry}
                    >Try again</button
                >
            </div>
        {:else if menu.status === "ready" && sections.length === 0}
            <div class="empty-state">
                <strong>No matches</strong><span
                    >{hasSearch
                        ? "No dishes match your search."
                        : hasActiveFilters
                          ? "No dishes match these filters."
                          : "No dishes are listed."}</span
                >
                {#if hasSearch || hasActiveFilters}
                    <div class="empty-actions">
                        {#if hasSearch}<button
                                class="text-button"
                                type="button"
                                onclick={clearSearch}>Clear search</button
                            >{/if}
                        {#if hasActiveFilters}<button
                                class="text-button"
                                type="button"
                                onclick={clearFilters}>Clear filters</button
                            >{/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
    {#if !["idle", "loading", "unsupported"].includes(menu.status)}<a
            class="menu-link"
            href={`https://middlebury.nutrislice.com/menu/${hall.id}/${meal}/${date}`}
            target="_blank"
            rel="noopener noreferrer"
            >View original menu<ExternalLink size={14} aria-hidden="true" /></a
        >{/if}
</section>

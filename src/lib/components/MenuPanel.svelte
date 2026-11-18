<script lang="ts">
    import { ExternalLink, Image as ImageIcon } from "@lucide/svelte";
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
    import type { Hall, MenuSection } from "$lib/menu/types";

    let {
        hall,
        date,
        meal,
        menu,
        sections,
        now,
        comparison,
        hasActiveFilters,
        clearFilters,
        retry,
        selectMeal,
        showHours
    }: {
        hall: Hall;
        date: string;
        meal: string;
        menu: HallMenuState;
        sections: MenuSection[];
        now: Date;
        comparison: boolean;
        hasActiveFilters: boolean;
        clearFilters: () => void;
        retry: () => void;
        selectMeal: (meal: string) => void;
        showHours: (hallId: string) => void;
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
                            <li class="menu-item">
                                <div class="item-copy">
                                    <p class="item-name">
                                        {item.name ?? "Unnamed item"}
                                    </p>
                                    {#if item.subtext}<p class="item-subtext">
                                            {item.subtext}
                                        </p>{/if}
                                    {#if item.iconNames?.length}<p
                                            class="item-icons"
                                        >
                                            {#each item.iconNames as name (name)}<span
                                                    class="item-label"
                                                    >{#if iconMap[name]}<span
                                                            class="label-pictogram"
                                                            aria-hidden="true"
                                                            >{iconMap[
                                                                name
                                                            ].slice(
                                                                0,
                                                                -name.length
                                                            )}</span
                                                        >{/if}{name}</span
                                                >{/each}
                                        </p>{/if}
                                </div>
                                <a
                                    class="image-link"
                                    href={`https://www.google.com/search?q=${encodeURIComponent(item.name ?? "Menu item")}&tbm=isch`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Search for an image of ${item.name ?? "this menu item"}`}
                                    title="Search images"
                                    ><ImageIcon
                                        size={17}
                                        aria-hidden="true"
                                    /></a
                                >
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
                    >{hasActiveFilters
                        ? "No dishes match these filters."
                        : "No dishes are listed."}</span
                >{#if hasActiveFilters}<button
                        class="text-button"
                        type="button"
                        onclick={clearFilters}>Clear filters</button
                    >{/if}
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

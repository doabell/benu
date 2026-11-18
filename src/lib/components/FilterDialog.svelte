<script lang="ts">
    import { X } from "@lucide/svelte";
    import { dietaryDisclaimer, iconMap } from "$lib/menu/data";
    import {
        filterGroups,
        type FilterState,
        type FilterStates
    } from "$lib/menu/view";

    let {
        states,
        activeCount,
        cycle,
        clear,
        closed
    }: {
        states: FilterStates;
        activeCount: number;
        cycle: (name: string) => void;
        clear: () => void;
        closed: () => void;
    } = $props();
    let dialog: HTMLDialogElement;
    let closeButton: HTMLButtonElement;
    const stateFor = (name: string): FilterState => states[name] ?? "on";
    const stateLabel = (state: FilterState): string =>
        state === "off" ? "excluded" : state === "only" ? "only" : "included";
    export function show(): void {
        dialog.showModal();
    }
</script>

<dialog
    bind:this={dialog}
    id="menu-filters"
    class="filter-dialog"
    aria-labelledby="filters-title"
    closedby="any"
    onclose={closed}
>
    <header class="filter-dialog-heading">
        <div>
            <h2 id="filters-title">Filters</h2>
            <p class="filter-status">
                {activeCount ? `${activeCount} active` : "No active filters"}
            </p>
        </div>
        <div class="filter-dialog-actions">
            {#if activeCount}
                <button
                    class="text-button clear-filters"
                    type="button"
                    onclick={() => {
                        clear();
                        closeButton.focus();
                    }}>Clear filters</button
                >
            {/if}
            <form method="dialog">
                <button
                    bind:this={closeButton}
                    class="icon-button"
                    type="submit"
                    aria-label="Close filters"
                    ><X size={20} aria-hidden="true" /></button
                >
            </form>
        </div>
    </header>
    <search class="filter-dialog-body" aria-label="Filter menu items">
        <div class="filter-groups">
            {#each filterGroups as group, groupIndex (group.label)}
                <fieldset class="filter-group">
                    <legend>{group.label}</legend>
                    <div class="filter-list">
                        {#each group.filters as filter, index (filter)}
                            {@const state = stateFor(filter)}
                            <!-- svelte-ignore a11y_autofocus (Focus enters this editor only after the user opens the dialog.) -->
                            <button
                                class="filter-chip"
                                class:off={state === "off"}
                                class:only={state === "only"}
                                type="button"
                                autofocus={groupIndex === 0 && index === 0}
                                aria-label={`${filter}: ${stateLabel(state)}`}
                                title={`${stateLabel(state)} — click to cycle`}
                                data-state={state}
                                onclick={() => cycle(filter)}
                                >{iconMap[filter] ?? filter}</button
                            >
                        {/each}
                    </div>
                </fieldset>
            {/each}
        </div>
        <p class="dietary-disclaimer">{dietaryDisclaimer}</p>
    </search>
</dialog>

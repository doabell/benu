<script lang="ts">
    import { Plus, X } from "@lucide/svelte";
    import { dietaryDisclaimer, iconMap } from "$lib/menu/data";
    import {
        filterGroups,
        normalizeMenuText,
        type CustomFilter,
        type FilterState,
        type FilterStates
    } from "$lib/menu/view";

    let {
        states,
        customFilters,
        activeCount,
        cycle,
        addCustom,
        cycleCustom,
        removeCustom,
        clear,
        closed
    }: {
        states: FilterStates;
        customFilters: CustomFilter[];
        activeCount: number;
        cycle: (name: string) => void;
        addCustom: (term: string) => void;
        cycleCustom: (term: string) => void;
        removeCustom: (term: string) => void;
        clear: () => void;
        closed: () => void;
    } = $props();
    let dialog: HTMLDialogElement;
    let closeButton: HTMLButtonElement;
    let termInput: HTMLInputElement;
    let draft = $state("");
    const stateFor = (name: string): FilterState => states[name] ?? "on";
    const stateLabel = (state: FilterState): string =>
        state === "off" ? "excluded" : state === "only" ? "only" : "included";

    function submitCustom(event: SubmitEvent): void {
        event.preventDefault();
        const term = draft.trim().replace(/\s+/g, " ");
        const key = normalizeMenuText(term);
        const message = !key
            ? "Enter a word or phrase."
            : customFilters.some(
                    (filter) => normalizeMenuText(filter.term) === key
                )
              ? "That term is already a custom filter."
              : "";
        if (message) {
            termInput.setCustomValidity(message);
            termInput.focus();
            termInput.reportValidity();
            return;
        }
        addCustom(term);
        draft = "";
        termInput.focus();
    }

    export function show(): void {
        termInput.setCustomValidity("");
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
            <div class="filter-column">
                {@render labelGroup(filterGroups.dietary, true)}
                {@render labelGroup(filterGroups.meatAndSeafood)}
                {@render labelGroup(filterGroups.otherAllergens)}
            </div>
            <div class="filter-column">
                {@render labelGroup(filterGroups.sourcing)}
                {@render labelGroup(filterGroups.dairyAndAlcohol)}
                {@render labelGroup(filterGroups.nuts)}
            </div>
            {@render customGroup()}
        </div>
        <p class="dietary-disclaimer">{dietaryDisclaimer}</p>
    </search>
</dialog>

{#snippet labelGroup(
    group: { label: string; filters: string[] },
    first = false
)}
    <fieldset class="filter-group">
        <legend>{group.label}</legend>
        <div class="filter-list">
            {#each group.filters as filter, index (filter)}
                {@render chip(
                    filter,
                    iconMap[filter] ?? filter,
                    stateFor(filter),
                    () => cycle(filter),
                    first && index === 0
                )}
            {/each}
        </div>
    </fieldset>
{/snippet}

{#snippet customGroup()}
    <fieldset class="filter-group custom-filter-group">
        <legend id="custom-filters-title">Custom filters</legend>
        <div class="filter-list">
            {#each customFilters as filter (filter.term)}
                <div class="custom-filter">
                    {@render chip(filter.term, filter.term, filter.state, () =>
                        cycleCustom(filter.term)
                    )}
                    <button
                        class="icon-button remove-custom-filter"
                        type="button"
                        aria-label={`Remove custom filter ${filter.term}`}
                        onclick={() => {
                            removeCustom(filter.term);
                            termInput.setCustomValidity("");
                            termInput.focus();
                        }}><X size={16} aria-hidden="true" /></button
                    >
                </div>
            {/each}
            <form
                class="custom-filter-form"
                method="dialog"
                aria-labelledby="custom-filters-title"
                onsubmit={submitCustom}
            >
                <label class="sr-only" for="custom-filter-term"
                    >Filter term</label
                >
                <input
                    bind:this={termInput}
                    bind:value={draft}
                    id="custom-filter-term"
                    class="menu-text-input"
                    type="text"
                    name="term"
                    autocomplete="off"
                    enterkeyhint="done"
                    placeholder="e.g. garlic"
                    required
                    oninput={() => termInput.setCustomValidity("")}
                />
                <button class="action-button" type="submit">
                    <Plus size={16} aria-hidden="true" />
                    <span>Add</span>
                </button>
            </form>
        </div>
    </fieldset>
{/snippet}

{#snippet chip(
    name: string,
    label: string,
    state: FilterState,
    activate: () => void,
    first = false
)}
    <!-- svelte-ignore a11y_autofocus (Focus enters this editor only after the user opens the dialog.) -->
    <button
        class="filter-chip"
        class:off={state === "off"}
        class:only={state === "only"}
        type="button"
        autofocus={first}
        aria-label={`${name}: ${stateLabel(state)}`}
        title={`${stateLabel(state)} — click to cycle`}
        data-state={state}
        onclick={activate}>{label}</button
    >
{/snippet}

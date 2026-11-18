<script lang="ts">
    import { tick } from "svelte";
    import { ExternalLink, X } from "@lucide/svelte";
    import type { DishNutrition, MenuItem } from "$lib/menu/types";

    let { online }: { online: boolean } = $props();
    let dialog: HTMLDialogElement;
    let selected = $state.raw<MenuItem>();
    let photoFailed = $state(false);
    const titleId = $props.id();
    const numbers = new Intl.NumberFormat();
    const nutrients = [
        { key: "calories", label: "Calories", unit: "kcal" },
        { key: "proteinGrams", label: "Protein", unit: "g" },
        { key: "carbGrams", label: "Carbs", unit: "g" },
        { key: "fatGrams", label: "Fat", unit: "g" },
        { key: "fiberGrams", label: "Fiber", unit: "g" },
        { key: "sodiumMg", label: "Sodium", unit: "mg" }
    ] as const satisfies ReadonlyArray<{
        key: keyof DishNutrition;
        label: string;
        unit: string;
    }>;

    export async function show(item: MenuItem): Promise<void> {
        selected = item;
        photoFailed = false;
        await tick();
        dialog.showModal();
    }
</script>

<dialog
    bind:this={dialog}
    id="dish-details"
    class="dish-dialog"
    aria-labelledby={titleId}
    closedby="any"
    onclose={() => {
        selected = undefined;
    }}
>
    {#if selected?.details}
        {@const details = selected.details}
        <header class="dish-dialog-heading">
            <div>
                <h2 id={titleId}>{selected.name ?? "Menu item"}</h2>
                {#if details.servingSize}
                    <p class="dish-serving">
                        {details.servingSize} per serving
                    </p>
                {/if}
            </div>
            <form method="dialog">
                <!-- svelte-ignore a11y_autofocus (The control only receives focus when opening this dialog.) -->
                <button
                    class="icon-button"
                    type="submit"
                    autofocus
                    aria-label="Close dish details"
                >
                    <X size={20} aria-hidden="true" />
                </button>
            </form>
        </header>
        <div class="dish-dialog-body">
            {#if selected.iconNames?.length}
                <ul class="dish-labels" aria-label="Dish labels" role="list">
                    {#each selected.iconNames as label (label)}
                        <li>{label}</li>
                    {/each}
                </ul>
            {/if}
            {#if details.nutrition}
                <section>
                    <h3>Nutrition</h3>
                    <dl class="dish-nutrition">
                        {#each nutrients as nutrient (nutrient.key)}
                            {@const amount = details.nutrition[nutrient.key]}
                            {#if amount !== undefined}
                                <div>
                                    <dt>{nutrient.label}</dt>
                                    <dd>
                                        {numbers.format(amount)}
                                        {nutrient.unit}
                                    </dd>
                                </div>
                            {/if}
                        {/each}
                    </dl>
                </section>
            {/if}
            {#if details.ingredients}
                <section>
                    <h3>Ingredients</h3>
                    <p class="dish-ingredients">{details.ingredients}</p>
                </section>
            {/if}
            {#if online && details.photoUrl && !photoFailed}
                <img
                    class="dish-photo"
                    src={details.photoUrl}
                    alt={details.photoAlt ?? ""}
                    width="480"
                    height="270"
                    decoding="async"
                    fetchpriority="low"
                    referrerpolicy="no-referrer"
                    onerror={() => {
                        photoFailed = true;
                    }}
                />
            {:else if online}
                <a
                    class="dish-image-search"
                    href={`https://www.google.com/search?q=${encodeURIComponent(selected.name ?? "Menu item")}&tbm=isch`}
                    target="_blank"
                    rel="noopener noreferrer"
                    >Search images <ExternalLink
                        size={14}
                        aria-hidden="true"
                    /></a
                >
            {/if}
        </div>
    {/if}
</dialog>

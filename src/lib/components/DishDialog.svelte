<script lang="ts">
    import { tick } from "svelte";
    import { Image as ImageIcon, X } from "@lucide/svelte";
    import { dietaryDisclaimer } from "$lib/menu/data";
    import { parseIngredients } from "$lib/menu/ingredients";
    import type { DishNutrition, MenuItem } from "$lib/menu/types";

    let { online }: { online: boolean } = $props();
    let dialog: HTMLDialogElement;
    let selected = $state.raw<MenuItem>();
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
    {#if selected}
        {@const name = selected.name ?? "Unnamed item"}
        {@const details = selected.details}
        {@const nutrition = details?.nutrition}
        {@const ingredients = parseIngredients(details?.ingredients ?? "")}
        <header class="dish-dialog-heading">
            <div>
                <h2 id={titleId}>{name}</h2>
                {#if details?.servingSize}
                    <p class="dish-serving">
                        {details.servingSize} per serving
                    </p>
                {/if}
            </div>
            <div class="dish-dialog-actions">
                {#if online}
                    <a
                        class="icon-button dish-image-search"
                        href={`https://www.google.com/search?q=${encodeURIComponent(name)}&tbm=isch`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Search for an image of ${name}`}
                        title="Search images"
                    >
                        <ImageIcon size={20} aria-hidden="true" />
                    </a>
                {/if}
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
            </div>
        </header>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (The scrollable region needs keyboard focus.) -->
        <section
            class="dish-dialog-body"
            aria-label="Dish information"
            tabindex="0"
        >
            {#if selected.iconNames?.length}
                <ul class="dish-labels" aria-label="Dish labels" role="list">
                    {#each selected.iconNames as label (label)}
                        <li>{label}</li>
                    {/each}
                </ul>
            {/if}
            {#if nutrition}
                <section>
                    <h3>Nutrition</h3>
                    <dl class="dish-nutrition">
                        {#each nutrients as nutrient (nutrient.key)}
                            {@const amount = nutrition[nutrient.key]}
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
            {#if ingredients.length}
                <section>
                    <h3>Ingredients</h3>
                    <ul class="dish-ingredients" aria-label="Ingredients">
                        {#each ingredients as ingredient (ingredient)}
                            <li>
                                {ingredient.name}
                                {#if ingredient.components}
                                    <span class="ingredient-components">
                                        {ingredient.components}
                                    </span>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}
            {#if !details?.servingSize && !nutrition && !ingredients.length}
                <p class="dish-details-empty">
                    No additional details available.
                </p>
            {/if}
            <p class="dietary-disclaimer">{dietaryDisclaimer}</p>
        </section>
    {/if}
</dialog>

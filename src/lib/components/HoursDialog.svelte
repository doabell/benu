<script lang="ts">
    import { onMount, tick } from "svelte";
    import { X, ExternalLink } from "@lucide/svelte";
    import { halls } from "$lib/menu/data";
    import {
        getDiningHoursNotes,
        getWeeklyMealHours
    } from "$lib/menu/schedule";

    let dialog: HTMLDialogElement;
    let place = $state(halls[0].id);
    let clientReady = $state(false);
    onMount(() => {
        clientReady = true;
    });
    function timeParts(value: string): string[] {
        const parts = value.split("–");
        if (parts.length !== 2) return parts;
        const [start, end] = parts;
        const period = start.match(/ (AM|PM)$/)?.[0];
        return [
            period && end.endsWith(period)
                ? start.slice(0, -period.length)
                : start,
            end
        ];
    }
    export async function show(hallId: string): Promise<void> {
        place = halls.some((hall) => hall.id === hallId) ? hallId : halls[0].id;
        await tick();
        dialog.removeAttribute("data-positioned");
        dialog.style.removeProperty("--hours-top");
        dialog.showModal();
        // Center on opening, then preserve the top as each hall's content changes.
        const top = dialog.getBoundingClientRect().top;
        dialog.style.setProperty(
            "--hours-top",
            `${(top / innerHeight) * 100}svh`
        );
        dialog.setAttribute("data-positioned", "");
    }
</script>

<dialog
    bind:this={dialog}
    class="hours-dialog"
    aria-labelledby="hours-title"
    closedby="any"
>
    <header class="hours-dialog-heading">
        <div>
            <h2 id="hours-title">Dining hours</h2>
            <span class="hours-zone">Eastern Time</span>
        </div>
        <form method="dialog">
            <button
                class="icon-button"
                type="submit"
                aria-label="Close dining hours"
                ><X size={20} aria-hidden="true" /></button
            >
        </form>
    </header>
    <div
        class="tab-list hours-halls"
        role="group"
        aria-label="Dining hours for hall"
    >
        {#each halls as hall (hall.id)}<button
                class="tab-button"
                class:active={place === hall.id}
                type="button"
                aria-pressed={place === hall.id}
                onclick={() => (place = hall.id)}>{hall.name}</button
            >{/each}
    </div>
    {#if clientReady}<table class="hours-table">
            <caption class="sr-only"
                >{halls.find((hall) => hall.id === place)?.name} dining hours</caption
            >
            <thead
                ><tr
                    ><th scope="col">Meal</th><th scope="col">Mon–Fri</th><th
                        scope="col">Weekends</th
                    ></tr
                ></thead
            >
            <tbody
                >{#each getWeeklyMealHours(place) as row (row.label)}<tr
                        ><th scope="row">{row.label}</th><td
                            >{@render timeRange(row.weekday)}</td
                        ><td>{@render timeRange(row.weekend)}</td></tr
                    >{/each}</tbody
            >
        </table>
        {#each getDiningHoursNotes(place) as note (note)}<p
                class="hours-detail"
            >
                {note}
            </p>{/each}
    {/if}
    <p class="hours-detail">
        Breaks, holidays, and special events may have different hours.
    </p>
    <a
        class="hours-source"
        href="https://www.middlebury.edu/dining-services/general-information"
        target="_blank"
        rel="noopener noreferrer"
        >Dining Services schedule<ExternalLink
            size={13}
            aria-hidden="true"
        /></a
    >
</dialog>

{#snippet timeRange(value: string)}
    <span class="hours-range"
        >{#each timeParts(value) as part, index (index)}<span
                >{part}{index === 0 && value.includes("–") ? "–" : ""}</span
            >{/each}</span
    >
{/snippet}

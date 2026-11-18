<script lang="ts">
    import { tick } from "svelte";
    import { CalendarDays, ChevronLeft, ChevronRight } from "@lucide/svelte";
    import { shiftDate } from "$lib/menu/dates";
    import { formatMenuDate } from "$lib/menu/view";

    let {
        date,
        today,
        select,
        disabled = false
    }: {
        date: string;
        today: string;
        select: (date: string) => void;
        disabled?: boolean;
    } = $props();
    let input: HTMLInputElement;
    let nativeEntry = $state(false);
    const label = $derived(formatMenuDate(date, today));
    async function openPicker(): Promise<void> {
        if (typeof input.showPicker === "function") {
            try {
                input.showPicker();
                return;
            } catch {
                /* Keep native date entry available if the picker cannot open. */
            }
        }
        nativeEntry = true;
        await tick();
        input.focus();
    }
</script>

<div class="date-selector">
    <button
        class="icon-button"
        type="button"
        {disabled}
        aria-label="Previous day"
        onclick={() => select(shiftDate(date, -1))}
        ><ChevronLeft size={18} aria-hidden="true" /></button
    >
    <div class="date-picker">
        {#if !nativeEntry}
            <button
                class="date-label"
                type="button"
                {disabled}
                aria-label={`Choose menu date: ${label}`}
                onclick={openPicker}
            >
                <CalendarDays size={17} aria-hidden="true" /><span title={label}
                    >{label}</span
                >
            </button>
        {/if}
        <label for="menu-date" class="sr-only">Menu date</label>
        <input
            bind:this={input}
            class:sr-only={!nativeEntry}
            id="menu-date"
            type="date"
            {disabled}
            tabindex={nativeEntry ? 0 : -1}
            value={date}
            onchange={(event) => select(event.currentTarget.value)}
        />
    </div>
    <button
        class="icon-button"
        type="button"
        {disabled}
        aria-label="Next day"
        onclick={() => select(shiftDate(date, 1))}
        ><ChevronRight size={18} aria-hidden="true" /></button
    >
</div>

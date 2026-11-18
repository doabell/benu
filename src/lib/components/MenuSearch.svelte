<script lang="ts">
    import { Search, X } from "@lucide/svelte";

    let {
        query = $bindable(""),
        active,
        disabled
    }: { query: string; active: boolean; disabled: boolean } = $props();
    const id = $props.id();
    let panel: HTMLElement;
    let input: HTMLInputElement;

    function submit(event: SubmitEvent): void {
        event.preventDefault();
        panel.hidePopover();
    }
</script>

<button
    class="icon-button search-toggle"
    class:active
    type="button"
    {disabled}
    aria-label="Search menus"
    aria-describedby={active ? `${id}-active` : undefined}
    popovertarget={id}
>
    <Search size={20} aria-hidden="true" />
</button>
{#if active}<span class="sr-only" id={`${id}-active`}
        >Searching for {query}</span
    >{/if}
<search
    bind:this={panel}
    {id}
    popover="auto"
    class="menu-search-popover"
    aria-labelledby={`${id}-label`}
>
    <form aria-labelledby={`${id}-label`} onsubmit={submit}>
        <label id={`${id}-label`} for={`${id}-input`}>Search menus</label>
        <div class="search-fields">
            <!-- svelte-ignore a11y_autofocus (Focus moves to the field when the user opens search.) -->
            <input
                bind:this={input}
                bind:value={query}
                id={`${id}-input`}
                class="menu-text-input"
                type="search"
                name="query"
                autocomplete="off"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="search"
                placeholder="Dish, ingredient, or label"
                autofocus
            />
            <button
                class="icon-button clear-search"
                type="button"
                disabled={!query}
                aria-label="Clear search"
                onclick={() => {
                    query = "";
                    input.focus();
                }}
            >
                <X size={20} aria-hidden="true" />
            </button>
        </div>
    </form>
</search>

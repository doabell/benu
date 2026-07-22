<script lang="ts">
    interface Props {
        hallId: string;
        class?: string;
    }

    let { hallId, class: className = "" }: Props = $props();
</script>

<svg class={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <use href={`/hall-icons.svg#${hallId}`} />
</svg>

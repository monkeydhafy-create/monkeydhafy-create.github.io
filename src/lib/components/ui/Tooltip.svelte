<script lang="ts">
  import { Tooltip } from '@ark-ui/svelte/tooltip';
  import { Portal } from '@ark-ui/svelte/portal';
  import type { Snippet } from 'svelte';

  interface Props {
    content: string;
    children?: Snippet;
    openDelay?: number;
    closeDelay?: number;
  }

  let {
    content,
    children,
    openDelay = 150,
    closeDelay = 100,
  }: Props = $props();
</script>

<Tooltip.Root {openDelay} {closeDelay}>
  <Tooltip.Trigger class="inline-flex cursor-default">
    {@render children?.()}
  </Tooltip.Trigger>
  <Portal>
    <Tooltip.Positioner class="z-[300]">
      <Tooltip.Content
        class="
          bg-zinc-800 text-zinc-100 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700
          shadow-lg font-sans font-medium select-none pointer-events-none max-w-xs
          transition-opacity duration-150
        "
      >
        {content}
      </Tooltip.Content>
    </Tooltip.Positioner>
  </Portal>
</Tooltip.Root>

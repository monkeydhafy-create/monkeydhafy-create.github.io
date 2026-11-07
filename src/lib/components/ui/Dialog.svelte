<script lang="ts">
  import { Dialog } from '@ark-ui/svelte/dialog';
  import { Portal } from '@ark-ui/svelte/portal';
  import type { Snippet } from 'svelte';
  import { triggerHaptic } from '$lib/design-system/tokens';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string;
    trigger?: Snippet;
    children?: Snippet;
    class?: string;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    title,
    description,
    trigger,
    children,
    class: className = '',
  }: Props = $props();

  function handleOpenChange(details: { open: boolean }) {
    triggerHaptic('light');
    open = details.open;
    onOpenChange?.(details.open);
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  {#if trigger}
    <Dialog.Trigger class="inline-flex">
      {@render trigger()}
    </Dialog.Trigger>
  {/if}

  <Portal>
    <!-- Blur Backdrop -->
    <Dialog.Backdrop
      class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity duration-200"
    />

    <!-- Positioner: Centered on Desktop, Bottom Sheet on Mobile -->
    <Dialog.Positioner
      class="
        fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4
        overflow-y-auto pointer-events-none
      "
    >
      <Dialog.Content
        class="
          pointer-events-auto w-full sm:max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
          rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl relative
          transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
          {className}
        "
      >
        <!-- Mobile Handle -->
        <div class="sm:hidden flex justify-center pb-4 -mt-2">
          <div class="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full"></div>
        </div>

        {#if title}
          <Dialog.Title class="font-sans font-semibold text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 leading-snug pr-8">
            {title}
          </Dialog.Title>
        {/if}

        {#if description}
          <Dialog.Description class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
            {description}
          </Dialog.Description>
        {/if}

        <div class="mt-4">
          {@render children?.()}
        </div>

        <!-- Close Button -->
        <Dialog.CloseTrigger
          class="
            absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center
            text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer
          "
        >
          ✕
        </Dialog.CloseTrigger>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>

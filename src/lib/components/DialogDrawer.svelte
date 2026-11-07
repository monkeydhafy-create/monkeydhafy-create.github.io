<script lang="ts">
  import type { Snippet } from 'svelte';
  import { triggerHaptic } from '$lib/constants/tokens';

  interface Props {
    open?: boolean;
    title?: string;
    onclose?: () => void;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    title = 'SYSTEM DIALOG',
    onclose,
    children,
  }: Props = $props();

  function close() {
    triggerHaptic('lightTap');
    open = false;
    onclose?.();
  }

  // Strict Body Scroll Lock & Touch Gesture Confinement
  $effect(() => {
    if (typeof document === 'undefined') return;

    if (open) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      // Lock body scroll completely
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  });
</script>

{#if open}
  <!-- Backdrop (Locks touch action & prevent click-through) -->
  <div
    class="fixed inset-0 bg-black/60 z-[200] backdrop-blur-[2px] transition-opacity touch-none select-none"
    onclick={close}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Escape' && close()}
  ></div>

  <!-- Responsive Container: Mobile Bottom Drawer vs Desktop Center Modal -->
  <div
    class="
      fixed z-[210]
      /* Mobile: Bottom Sheet */
      bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl
      /* Desktop: Centered Dialog */
      md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full md:rounded-none
      bg-white dark:bg-[#141414] text-black dark:text-white
      border-t-[3px] border-x-[3px] md:border-[4px] border-black dark:border-white
      shadow-[0px_-4px_0px_#000] dark:shadow-[0px_-4px_0px_#FFF] md:shadow-[12px_12px_0px_#000] md:dark:shadow-[12px_12px_0px_#FFF]
      overflow-hidden flex flex-col
      overscroll-contain
      transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
    "
  >
    <!-- Mobile Drag Handle -->
    <div class="md:hidden flex justify-center pt-3 pb-1">
      <div class="w-10 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full border border-black dark:border-white"></div>
    </div>

    <!-- Header Bar -->
    <div class="flex items-center justify-between px-5 py-3 border-b-[3px] md:border-b-[4px] border-black dark:border-white bg-[#FFE600] text-black">
      <h3 class="font-sans font-black text-base md:text-lg uppercase tracking-tight">
        {title}
      </h3>
      <button
        type="button"
        onclick={close}
        class="w-8 h-8 flex items-center justify-center font-mono font-black text-sm border-2 border-black dark:border-white bg-white dark:bg-[#141414] text-black dark:text-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFF] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
      >
        ✕
      </button>
    </div>

    <!-- Content Area (Only scroll inside modal/drawer) -->
    <div class="p-5 md:p-6 overflow-y-auto flex-1 font-sans text-sm leading-relaxed overscroll-contain">
      {@render children?.()}
    </div>
  </div>
{/if}

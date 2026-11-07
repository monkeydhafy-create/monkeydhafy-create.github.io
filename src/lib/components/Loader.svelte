<script lang="ts">
  interface Props {
    progress?: number; // 0 to 100
    label?: string;
    variant?: 'yellow' | 'cyan' | 'magenta';
    class?: string;
  }

  let {
    progress = 65,
    label = 'LOADING RUNTIME...',
    variant = 'yellow',
    class: className = '',
  }: Props = $props();

  // High-visibility Neo-Brutalist Hazard Colors for both Light & Dark Mode
  const variantConfig: Record<'yellow' | 'cyan' | 'magenta', { bg: string; stripe: string }> = {
    yellow: {
      bg: '#FFE600',
      stripe: 'rgba(0, 0, 0, 0.42)',
    },
    cyan: {
      bg: '#00F0FF',
      stripe: 'rgba(0, 0, 0, 0.42)',
    },
    magenta: {
      bg: '#FF007A',
      stripe: 'rgba(0, 0, 0, 0.42)',
    },
  };

  const clampedProgress = $derived(Math.max(0, Math.min(100, progress)));
</script>

<div class="w-full {className}">
  {#if label}
    <div class="flex justify-between font-mono text-xs font-bold uppercase mb-1.5 text-black dark:text-white leading-snug">
      <span class="break-words mr-2">{label}</span>
      <span class="shrink-0">{clampedProgress}%</span>
    </div>
  {/if}

  <!-- Progress Bar Outer Track: Deep contrast in Dark Mode (#18181B recessed track vs white border) -->
  <div class="h-6 md:h-7 border-[3px] md:border-[4px] border-black dark:border-white bg-neutral-200 dark:bg-[#18181B] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFFFFF] p-0.5 overflow-hidden transition-colors duration-150">
    <div
      class="h-full relative transition-all duration-300"
      style="
        width: {clampedProgress}%;
        background-color: {variantConfig[variant].bg};
        background-image: repeating-linear-gradient(
          -45deg,
          {variantConfig[variant].stripe} 0px,
          {variantConfig[variant].stripe} 10px,
          transparent 10px,
          transparent 20px
        );
      "
    ></div>
  </div>
</div>

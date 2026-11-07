<script lang="ts">
  interface Props {
    height?: string;
    width?: string;
    class?: string;
  }

  let {
    height = 'h-12',
    width = 'w-full',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="
    border-[2px] md:border-[3px] border-black dark:border-white
    shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF]
    bg-neutral-200 dark:bg-[#18181B]
    animate-pulse
    transition-colors duration-150
    {height} {width} {className}
  "
  style="
    background-image: repeating-linear-gradient(
      45deg,
      var(--nb-canvas-dot),
      var(--nb-canvas-dot) 8px,
      transparent 8px,
      transparent 16px
    );
  "
></div>

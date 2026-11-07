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
    shadow-[3px_3px_0px_#000]
    bg-neutral-100 dark:bg-neutral-800
    animate-pulse
    {height} {width} {className}
  "
  style="
    background-image: repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.08),
      rgba(0, 0, 0, 0.08) 8px,
      transparent 8px,
      transparent 16px
    );
  "
></div>

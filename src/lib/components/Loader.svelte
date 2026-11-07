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

  const colorStyles = {
    yellow: 'from-[#FFE600] to-[#FFE600]',
    cyan: 'from-[#00F0FF] to-[#00F0FF]',
    magenta: 'from-[#FF007A] to-[#FF007A]',
  };
</script>

<div class="w-full {className}">
  {#if label}
    <div class="flex justify-between font-mono text-xs font-bold uppercase mb-1.5 text-black dark:text-white">
      <span>{label}</span>
      <span>{progress}%</span>
    </div>
  {/if}

  <div class="h-6 md:h-7 border-[3px] md:border-[4px] border-black dark:border-white bg-white dark:bg-neutral-900 shadow-[3px_3px_0px_#000] p-0.5 overflow-hidden">
    <div
      class="h-full bg-gradient-to-r {colorStyles[variant]} relative transition-all duration-300"
      style="
        width: {progress}%;
        background-image: repeating-linear-gradient(
          -45deg,
          #000000,
          #000000 10px,
          transparent 10px,
          transparent 20px
        );
      "
    ></div>
  </div>
</div>

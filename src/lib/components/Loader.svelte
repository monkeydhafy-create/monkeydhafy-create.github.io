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

  const shadowStyles = {
    yellow: 'dark:shadow-[3px_3px_0px_#FFFFFF]',
    cyan: 'dark:shadow-[3px_3px_0px_#FFFFFF]',
    magenta: 'dark:shadow-[3px_3px_0px_#FFFFFF]',
  };
</script>

<div class="w-full {className}">
  {#if label}
    <div class="flex justify-between font-mono text-xs font-bold uppercase mb-1.5 text-black dark:text-white">
      <span>{label}</span>
      <span>{progress}%</span>
    </div>
  {/if}

  <div class="h-6 md:h-7 border-[3px] md:border-[4px] border-black dark:border-white bg-white dark:bg-[#0E0E10] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFFFFF] p-0.5 overflow-hidden transition-colors duration-150">
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

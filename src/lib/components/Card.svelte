<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    badge?: string;
    badgeColor?: 'yellow' | 'cyan' | 'magenta' | 'lime';
    children?: Snippet;
    class?: string;
  }

  let {
    title,
    badge,
    badgeColor = 'yellow',
    children,
    class: className = '',
  }: Props = $props();

  const badgeClasses = {
    yellow: 'bg-[#FFE600] text-black',
    cyan: 'bg-[#00F0FF] text-black',
    magenta: 'bg-[#FF007A] text-white',
    lime: 'bg-[#00FF66] text-black',
  };
</script>

<div
  class="
    bg-white dark:bg-[#0E0E10] text-black dark:text-white
    border-[2.5px] md:border-[3px] border-black dark:border-white
    shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] md:shadow-[6px_6px_0px_#000] md:dark:shadow-[6px_6px_0px_#FFFFFF]
    p-4 md:p-6 mb-4
    transition-colors duration-150
    {className}
  "
>
  {#if title || badge}
    <div class="flex items-center justify-between pb-3 mb-4 border-b-[2px] md:border-b-[2.5px] border-black dark:border-white">
      {#if title}
        <h3 class="font-sans font-black text-lg md:text-xl uppercase tracking-tight leading-snug text-black dark:text-white">
          {title}
        </h3>
      {/if}
      {#if badge}
        <span class="font-mono text-[10px] md:text-xs font-bold uppercase px-2 py-1 border-[2px] border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFFFFF] inline-flex items-center justify-center leading-snug {badgeClasses[badgeColor]}">
          {badge}
        </span>
      {/if}
    </div>
  {/if}

  {@render children?.()}
</div>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'yellow' | 'magenta' | 'lime' | 'cyan' | 'black' | 'white';
    rotate?: 'left' | 'right' | 'none';
    size?: 'sm' | 'md';
    children?: Snippet;
    class?: string;
  }

  let {
    variant = 'yellow',
    rotate = 'none',
    size = 'md',
    children,
    class: className = '',
  }: Props = $props();

  const variantStyles = {
    yellow: 'bg-[#FFE600] text-black border-black dark:border-white',
    magenta: 'bg-[#FF007A] text-white border-black dark:border-white',
    lime: 'bg-[#00FF66] text-black border-black dark:border-white',
    cyan: 'bg-[#00F0FF] text-black border-black dark:border-white',
    black: 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white',
    white: 'bg-white text-black border-black dark:bg-[#141414] dark:text-white dark:border-white',
  };

  const rotateStyles = {
    none: 'rotate-0',
    left: '-rotate-2 md:-rotate-3',
    right: 'rotate-2 md:rotate-3',
  };

  const sizeStyles = {
    sm: 'text-[9px] md:text-[10px] px-2 py-0.5',
    md: 'text-[11px] md:text-xs px-3 py-1',
  };
</script>

<span
  class="
    inline-flex items-center font-mono font-bold uppercase tracking-wider
    border-[2px] shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFF]
    select-none transition-all duration-100
    {sizeStyles[size]}
    {variantStyles[variant]}
    {rotateStyles[rotate]}
    {className}
  "
>
  {@render children?.()}
</span>

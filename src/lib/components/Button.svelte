<script lang="ts">
  import type { Snippet } from 'svelte';
  import { triggerHaptic } from '$lib/constants/tokens';

  interface Props {
    variant?: 'primary' | 'secondary' | 'dark' | 'outline' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidthOnMobile?: boolean;
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    class?: string;
  }

  let {
    variant = 'primary',
    size = 'md',
    fullWidthOnMobile = true,
    disabled = false,
    onclick,
    children,
    class: className = '',
  }: Props = $props();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px] md:min-h-[32px]',
    md: 'px-5 py-2.5 text-sm min-h-[48px] md:min-h-[42px]', // 48px touch target on mobile
    lg: 'px-7 py-3.5 text-base min-h-[54px] md:min-h-[48px]',
  };

  const variantClasses = {
    primary: 'bg-[#FFE600] text-black border-black dark:border-white hover:bg-[#FFF066] dark:hover:bg-[#FFF066] dark:hover:text-black shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    secondary: 'bg-[#00F0FF] text-black border-black dark:border-white hover:bg-[#66F5FF] dark:hover:bg-[#66F5FF] dark:hover:text-black shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    dark: 'bg-black text-white border-black dark:bg-[#27272A] dark:text-white dark:border-white hover:bg-neutral-800 dark:hover:bg-zinc-700 shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    outline: 'bg-white text-black border-black dark:bg-[#18181B] dark:text-white dark:border-white hover:bg-neutral-100 dark:hover:bg-[#27272A] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    danger: 'bg-[#FF007A] text-white border-black dark:border-white hover:bg-[#FF3399] dark:hover:bg-[#FF3399] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
  };

  function handleClick(e: MouseEvent) {
    if (disabled) return;
    triggerHaptic('lightTap');
    onclick?.(e);
  }
</script>

<button
  type="button"
  {disabled}
  onclick={handleClick}
  class="
    btn-tactile font-sans font-black uppercase tracking-tight
    border-[2.5px] md:border-[3px]
    shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]
    hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#000] md:hover:shadow-[2px_2px_0px_#000]
    active:translate-x-[3px] active:translate-y-[3px] md:active:translate-x-[4px] md:active:translate-y-[4px] active:shadow-none
    transition-all duration-75 select-none
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0
    {sizeClasses[size]}
    {variantClasses[variant]}
    {fullWidthOnMobile ? 'w-full md:w-auto' : ''}
    {className}
  "
>
  {@render children?.()}
</button>

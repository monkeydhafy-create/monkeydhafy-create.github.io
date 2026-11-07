<script lang="ts">
  import type { Snippet } from 'svelte';
  import { triggerHaptic } from '$lib/design-system/tokens';

  interface Props {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'contrast' | 'emerald' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    class?: string;
    children?: Snippet;
    type?: 'button' | 'submit' | 'reset';
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    onclick,
    class: className = '',
    children,
    type = 'button',
  }: Props = $props();

  const variantStyles = {
    // Brand Primary: Rich Emerald with crisp white text & ambient subtle glow (Supabase / Stripe High-Tech Craftsmanship)
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold border border-emerald-500/40 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_15px_rgba(16,185,129,0.22)] hover:shadow-[0_0_22px_rgba(16,185,129,0.38)] active:scale-[0.98]',
    // Neutral Secondary: Soft zinc backdrop for supporting actions
    secondary: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-700/80 font-medium active:scale-[0.98]',
    // Outline: Minimal hairline border
    outline: 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 font-medium active:scale-[0.98]',
    // Ghost: Zero border, clean hover
    ghost: 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium active:scale-[0.98]',
    // Contrast / Monochrome: Signature Vercel Inversion (Black on Light, White on Dark)
    contrast: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-50 border border-zinc-900/90 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 dark:border-zinc-200/80 font-medium shadow-sm active:scale-[0.98]',
    // Emerald Alias
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.22)] active:scale-[0.98]',
    // Danger: Soft rose warning
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 font-medium active:scale-[0.98]',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
    md: 'px-3.5 py-2 text-sm rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
  };

  function handleClick(e: MouseEvent) {
    if (disabled || loading) return;
    triggerHaptic('light');
    onclick?.(e);
  }
</script>

<button
  {type}
  disabled={disabled || loading}
  onclick={handleClick}
  class="
    inline-flex items-center justify-center font-sans font-medium select-none
    transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
    cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    {variantStyles[variant]}
    {sizeStyles[size]}
    {className}
  "
>
  {#if loading}
    <svg class="animate-spin -ml-0.5 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  {@render children?.()}
</button>

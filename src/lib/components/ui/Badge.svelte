<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'emerald' | 'cyan' | 'violet' | 'amber' | 'zinc';
    pulse?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'zinc',
    pulse = false,
    class: className = '',
    children,
  }: Props = $props();

  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 dark:border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25 dark:border-cyan-500/20',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25 dark:border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 dark:border-amber-500/20',
    zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700/60',
  };

  const dotStyles = {
    emerald: 'bg-emerald-400',
    cyan: 'bg-cyan-400',
    violet: 'bg-violet-400',
    amber: 'bg-amber-400',
    zinc: 'bg-zinc-400',
  };
</script>

<span
  class="
    inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium
    border select-none tracking-tight leading-snug
    {variantStyles[variant]}
    {className}
  "
>
  {#if pulse}
    <span class="relative flex h-2 w-2">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 {dotStyles[variant]}"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 {dotStyles[variant]}"></span>
    </span>
  {/if}
  {@render children?.()}
</span>

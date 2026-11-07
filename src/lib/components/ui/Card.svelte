<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    description?: string;
    badge?: string;
    badgeVariant?: 'emerald' | 'cyan' | 'violet' | 'amber' | 'zinc';
    class?: string;
    children?: Snippet;
    headerAction?: Snippet;
    glow?: 'none' | 'emerald' | 'cyan';
  }

  let {
    title,
    description,
    badge,
    badgeVariant = 'zinc',
    class: className = '',
    children,
    headerAction,
    glow = 'none',
  }: Props = $props();

  const glowStyles = {
    none: '',
    emerald: 'border-glow-emerald',
    cyan: 'border-glow-cyan',
  };
</script>

<div
  class="
    card-kairos rounded-xl p-5 sm:p-6 flex flex-col justify-between
    {glowStyles[glow]}
    {className}
  "
>
  {#if title || badge || headerAction}
    <div class="flex items-start justify-between gap-3 mb-4">
      <div>
        {#if badge}
          <span class="inline-block text-[11px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60 mb-2">
            {badge}
          </span>
        {/if}
        {#if title}
          <h3 class="font-sans font-semibold text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
            {title}
          </h3>
        {/if}
        {#if description}
          <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
            {description}
          </p>
        {/if}
      </div>

      {#if headerAction}
        <div class="shrink-0">
          {@render headerAction()}
        </div>
      {/if}
    </div>
  {/if}

  <div class="flex-1">
    {@render children?.()}
  </div>
</div>

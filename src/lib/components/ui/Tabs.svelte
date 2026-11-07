<script lang="ts">
  import { Tabs } from '@ark-ui/svelte/tabs';
  import type { Snippet } from 'svelte';
  import { triggerHaptic } from '$lib/design-system/tokens';

  interface TabItem {
    id: string;
    label: string;
    shortLabel?: string;
    icon?: string;
    badge?: string;
  }

  interface Props {
    items: TabItem[];
    value?: string;
    onValueChange?: (value: string) => void;
    class?: string;
    content?: Record<string, Snippet>;
    children?: Snippet;
  }

  let {
    items,
    value = $bindable(items[0]?.id || ''),
    onValueChange,
    class: className = '',
    content,
    children,
  }: Props = $props();

  function handleValueChange(details: { value: string }) {
    triggerHaptic('light');
    value = details.value;
    onValueChange?.(details.value);
  }
</script>

<Tabs.Root
  bind:value
  onValueChange={handleValueChange}
  class="w-full {className}"
>
  <!-- Segmented Control Bar (Zero horizontal scroll, full-width distribution on mobile) -->
  <Tabs.List class="relative flex items-center p-1 bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl gap-1 w-full">
    {#each items as item}
      {@const isActive = value === item.id}
      <Tabs.Trigger
        value={item.id}
        class="
          relative z-10 flex-1 justify-center px-2.5 py-1.5 rounded-lg text-xs font-sans font-medium select-none
          transition-colors duration-150 cursor-pointer flex items-center gap-1.5 text-center
          {isActive ? 'text-zinc-900 font-semibold dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}
        "
      >
        {#if item.icon}
          <span class="text-sm shrink-0">{item.icon}</span>
        {/if}
        {#if item.shortLabel}
          <span class="sm:hidden text-[11px] font-mono tracking-tight">{item.shortLabel}</span>
          <span class="hidden sm:inline font-mono text-xs">{item.label}</span>
        {:else}
          <span class="font-mono text-xs">{item.label}</span>
        {/if}
        {#if item.badge}
          <span class="hidden sm:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/50">
            {item.badge}
          </span>
        {/if}
      </Tabs.Trigger>
    {/each}
    
    <!-- Animated sliding pill indicator -->
    <Tabs.Indicator class="absolute bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-lg shadow-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]" />
  </Tabs.List>

  <!-- Render content snippets if passed -->
  {#if content}
    {#each items as item}
      <Tabs.Content value={item.id} class="mt-4 outline-none">
        {#if content[item.id]}
          {@render content[item.id]()}
        {/if}
      </Tabs.Content>
    {/each}
  {/if}

  {#if children}
    <div class="mt-4">
      {@render children()}
    </div>
  {/if}
</Tabs.Root>

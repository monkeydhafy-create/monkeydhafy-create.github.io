<script lang="ts">
  import { triggerHaptic } from '$lib/constants/tokens';

  interface TabItem {
    id: string;
    label: string;
    badge?: string;
  }

  interface Props {
    items: TabItem[];
    activeId?: string;
    onchange?: (id: string) => void;
    class?: string;
  }

  let { items, activeId = $bindable(items[0]?.id || ''), onchange, class: className = '' }: Props = $props();

  function selectTab(id: string) {
    if (activeId === id) return;
    triggerHaptic('lightTap');
    activeId = id;
    onchange?.(id);
  }

  function handleKeyDown(e: KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') {
      const nextIndex = (index + 1) % items.length;
      selectTab(items[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + items.length) % items.length;
      selectTab(items[prevIndex].id);
    }
  }
</script>

<!-- Mobile: Scrollable overflow-x; Desktop: Fixed row -->
<div class="w-full overflow-x-auto no-scrollbar pb-2 md:pb-0 {className}">
  <div 
    role="tablist"
    class="
      inline-flex md:flex w-max md:w-full border-[3px] md:border-[4px] border-black dark:border-white
      bg-neutral-100 dark:bg-[#1C1C1C] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFF]
      p-1 gap-1 select-none transition-colors duration-150
    "
  >
    {#each items as item, index}
      {@const isActive = activeId === item.id}
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        tabindex={isActive ? 0 : -1}
        onclick={() => selectTab(item.id)}
        onkeydown={(e) => handleKeyDown(e, index)}
        class="
          flex-1 px-4 py-2.5 min-h-[44px] md:min-h-[38px]
          flex items-center justify-center gap-2
          font-mono font-bold text-xs uppercase tracking-wider
          cursor-pointer transition-all duration-75 whitespace-nowrap
          {isActive 
            ? 'bg-[#FFE600] text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFF] -translate-y-0.5' 
            : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#252525]'}
        "
      >
        <span>{item.label}</span>
        {#if item.badge}
          <span class="px-1.5 py-0.2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-[9px] font-mono font-bold rounded-none">
            {item.badge}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</div>

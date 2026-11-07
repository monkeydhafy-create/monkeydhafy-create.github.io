<script lang="ts">
  import { triggerHaptic } from '$lib/constants/tokens';

  interface AccordionItem {
    id: string;
    title: string;
    badge?: string;
    content: string;
  }

  interface Props {
    items: AccordionItem[];
    multiple?: boolean;
    class?: string;
  }

  let { items, multiple = false, class: className = '' }: Props = $props();

  // Set of opened item IDs
  let openItems = $state<string[]>([]);

  $effect(() => {
    if (openItems.length === 0 && items.length > 0) {
      openItems = [items[0].id];
    }
  });

  function toggle(id: string) {
    triggerHaptic('mediumClick');
    if (multiple) {
      if (openItems.includes(id)) {
        openItems = openItems.filter((i) => i !== id);
      } else {
        openItems = [...openItems, id];
      }
    } else {
      openItems = openItems.includes(id) ? [] : [id];
    }
  }

  function handleKeyDown(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(id);
    }
  }
</script>

<div class="border-[2.5px] md:border-[3px] border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] md:shadow-[6px_6px_0px_#000] md:dark:shadow-[6px_6px_0px_#FFFFFF] bg-white dark:bg-[#0E0E10] overflow-hidden transition-colors duration-150 {className}">
  {#each items as item, index}
    {@const isOpen = openItems.includes(item.id)}
    <div class="border-b-[2px] md:border-b-[2.5px] border-black dark:border-white last:border-b-0">
      <!-- Accordion Header Trigger -->
      <button
        type="button"
        onclick={() => toggle(item.id)}
        onkeydown={(e) => handleKeyDown(e, item.id)}
        aria-expanded={isOpen}
        class="
          w-full px-4 md:px-6 py-3.5 md:py-4 flex items-center justify-between
          text-left cursor-pointer transition-colors duration-100 select-none
          min-h-[48px] md:min-h-[44px]
          {isOpen 
            ? 'bg-[#00F0FF] text-black font-black dark:bg-[#031C20] dark:text-[#00F0FF]' 
            : 'bg-white dark:bg-[#0E0E10] text-black dark:text-zinc-200 hover:bg-[#FFE600] hover:text-black dark:hover:bg-[#1C1900] dark:hover:text-[#FFE600]'}
        "
      >
        <div class="flex items-center gap-2.5">
          <span class="font-mono text-xs opacity-60">0{index + 1} /</span>
          <span class="font-sans font-black text-sm md:text-base uppercase tracking-tight leading-snug">
            {item.title}
          </span>
          {#if item.badge}
            <span class="hidden sm:inline-block px-1.5 py-0.5 bg-black text-white dark:bg-zinc-800 dark:text-zinc-200 text-[9px] font-mono font-bold uppercase border border-black dark:border-white">
              {item.badge}
            </span>
          {/if}
        </div>

        <!-- Indicator Icon -->
        <span 
          class="
            w-7 h-7 flex items-center justify-center font-mono font-black text-sm
            border-2 border-black dark:border-white bg-white dark:bg-[#18181B] text-black dark:text-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFFFFF]
            transition-transform duration-100
            {isOpen ? 'rotate-45 bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] dark:border-white' : 'rotate-0'}
          "
        >
          +
        </span>
      </button>

      <!-- Accordion Body -->
      {#if isOpen}
        <div class="px-4 md:px-6 py-4 bg-[#FFFDF0] dark:bg-[#141416] text-black dark:text-zinc-300 border-t-[2px] border-black dark:border-white font-sans text-xs md:text-sm leading-relaxed">
          {item.content}
        </div>
      {/if}
    </div>
  {/each}
</div>

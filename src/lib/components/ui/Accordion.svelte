<script lang="ts">
  import { Accordion } from '@ark-ui/svelte/accordion';
  import { triggerHaptic } from '$lib/design-system/tokens';

  interface AccordionItemData {
    value: string;
    title: string;
    subtitle?: string;
    content: string;
    badge?: string;
  }

  interface Props {
    items: AccordionItemData[];
    value?: string[];
    multiple?: boolean;
    collapsible?: boolean;
    class?: string;
  }

  let {
    items,
    value = $bindable([items[0]?.value || '']),
    multiple = false,
    collapsible = true,
    class: className = '',
  }: Props = $props();
</script>

<Accordion.Root
  bind:value
  {multiple}
  {collapsible}
  onValueChange={() => triggerHaptic('light')}
  class="w-full divide-y divide-zinc-200 dark:divide-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 overflow-hidden {className}"
>
  {#each items as item}
    <Accordion.Item
      value={item.value}
      class="group transition-colors duration-150 data-[state=open]:bg-zinc-50 dark:data-[state=open]:bg-zinc-800/30"
    >
      <Accordion.ItemTrigger
        class="
          w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer
          hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors select-none outline-none
        "
      >
        <div class="pr-4">
          <div class="flex items-center gap-2">
            <span class="font-sans font-medium text-sm sm:text-base text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {item.title}
            </span>
            {#if item.badge}
              <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700/60">
                {item.badge}
              </span>
            {/if}
          </div>
          {#if item.subtitle}
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-normal">
              {item.subtitle}
            </p>
          {/if}
        </div>

        <Accordion.ItemIndicator
          class="
            shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400
            bg-zinc-100 border border-zinc-200 dark:bg-zinc-800/80 dark:border-zinc-700/60 transition-transform duration-200
            group-data-[state=open]:rotate-180 group-data-[state=open]:text-emerald-600 dark:group-data-[state=open]:text-emerald-400 group-data-[state=open]:border-emerald-500/40
          "
        >
          ▼
        </Accordion.ItemIndicator>
      </Accordion.ItemTrigger>

      <Accordion.ItemContent
        class="
          px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans
          data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up
        "
      >
        {item.content}
      </Accordion.ItemContent>
    </Accordion.Item>
  {/each}
</Accordion.Root>

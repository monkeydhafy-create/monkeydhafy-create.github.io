<script lang="ts">
  import { triggerHaptic } from '$lib/constants/tokens';

  interface Option {
    value: string;
    label: string;
    badge?: string;
  }

  interface Props {
    label?: string;
    options: Option[];
    value?: string;
    placeholder?: string;
    onchange?: (val: string) => void;
    class?: string;
  }

  let {
    label,
    options,
    value = $bindable(options[0]?.value || ''),
    placeholder = 'Chọn tùy chọn...',
    onchange,
    class: className = '',
  }: Props = $props();

  let isOpen = $state(false);

  let selectedOption = $derived(options.find((o) => o.value === value));

  function select(val: string) {
    triggerHaptic('lightTap');
    value = val;
    isOpen = false;
    onchange?.(val);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isOpen = false;
    }
  }

  // Lock body scroll when mobile bottom sheet picker is open
  $effect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      // Lock scroll on mobile screens
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="relative w-full {className}">
  {#if label}
    <div class="block font-mono text-xs font-bold uppercase tracking-wider mb-1.5 text-black dark:text-white">
      {label}
    </div>
  {/if}

  <!-- Trigger Button -->
  <button
    type="button"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    onclick={() => { triggerHaptic('lightTap'); isOpen = !isOpen; }}
    class="
      w-full px-4 py-3 flex items-center justify-between
      bg-white dark:bg-[#141414] text-black dark:text-white
      border-[3px] md:border-[4px] border-black dark:border-white
      shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFF]
      cursor-pointer select-none min-h-[48px] md:min-h-[44px]
      transition-colors duration-150
    "
  >
    <span class="font-mono text-sm font-bold uppercase">
      {selectedOption ? selectedOption.label : placeholder}
    </span>
    <span class="font-mono text-xs font-black px-1.5 py-0.5 bg-[#FFE600] text-black border border-black dark:border-white shadow-[1px_1px_0px_#000] dark:shadow-[1px_1px_0px_#FFF]">
      {isOpen ? '▲' : '▼'}
    </span>
  </button>

  {#if isOpen}
    <!-- Backdrop for Mobile & Desktop click-outside -->
    <div
      class="fixed inset-0 z-[150] bg-black/40 md:bg-transparent touch-none select-none"
      onclick={() => isOpen = false}
      role="button"
      tabindex="-1"
      onkeydown={() => {}}
    ></div>

    <!-- Responsive Menu: Desktop Floating Dropdown vs Mobile Bottom Sheet -->
    <div
      role="listbox"
      class="
        fixed md:absolute z-[160]
        /* Mobile: Bottom Sheet Picker */
        bottom-0 left-0 right-0 max-h-[60vh] rounded-t-2xl
        /* Desktop: Floating Dropdown */
        md:bottom-auto md:left-0 md:right-0 md:top-full md:mt-2 md:max-h-60 md:rounded-none
        bg-white dark:bg-[#141414] border-t-[3px] md:border-[3px] border-black dark:border-white
        shadow-[0px_-4px_0px_#000] dark:shadow-[0px_-4px_0px_#FFF] md:shadow-[6px_6px_0px_#000] md:dark:shadow-[6px_6px_0px_#FFF]
        overflow-y-auto p-2 overscroll-contain
      "
    >
      <!-- Mobile Handle Bar -->
      <div class="md:hidden flex justify-center py-2 border-b border-neutral-200 dark:border-neutral-800 mb-2">
        <div class="w-10 h-1 bg-neutral-400 dark:bg-neutral-600 rounded-full"></div>
      </div>

      {#each options as opt}
        {@const isSelected = opt.value === value}
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          onclick={() => select(opt.value)}
          class="
            w-full px-4 py-3 flex items-center justify-between
            font-mono text-xs md:text-sm font-bold uppercase text-left cursor-pointer
            border-2 border-transparent transition-colors duration-75 min-h-[48px] md:min-h-[38px] mb-1
            {isSelected 
              ? 'bg-[#FFE600] text-black border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFF]' 
              : 'hover:bg-neutral-100 dark:hover:bg-[#1C1C1C] text-black dark:text-white'}
          "
        >
          <span>{opt.label}</span>
          {#if opt.badge}
            <span class="px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-[9px]">
              {opt.badge}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

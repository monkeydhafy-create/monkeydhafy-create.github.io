<script lang="ts">
  import { triggerHaptic } from '$lib/constants/tokens';

  interface Props {
    checked?: boolean;
    label?: string;
    onchange?: (checked: boolean) => void;
    disabled?: boolean;
    class?: string;
  }

  let {
    checked = $bindable(false),
    label,
    onchange,
    disabled = false,
    class: className = '',
  }: Props = $props();

  function toggle() {
    if (disabled) return;
    triggerHaptic('mediumClick');
    checked = !checked;
    onchange?.(checked);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<label class="inline-flex items-center gap-3 cursor-pointer select-none min-h-[48px] {className}">
  <!-- Hidden Accessibility Input -->
  <input
    type="checkbox"
    {disabled}
    bind:checked
    class="sr-only"
    onchange={() => toggle()}
  />

  <!-- Neo-Brutalist Switch Track -->
  <div
    role="switch"
    aria-checked={checked}
    tabindex={disabled ? -1 : 0}
    onclick={toggle}
    onkeydown={handleKeyDown}
    class="
      w-14 h-8 border-[3px] border-black dark:border-white shadow-[2px_2px_0px_#000]
      relative p-0.5 transition-colors duration-100 outline-none
      {checked ? 'bg-[#00FF66]' : 'bg-neutral-300 dark:bg-neutral-700'}
      {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    "
  >
    <!-- Switch Thumb Knob -->
    <div
      class="
        w-6 h-6 bg-black text-white dark:bg-white dark:text-black
        border border-black shadow-[1px_1px_0px_#000]
        flex items-center justify-center font-mono text-[9px] font-black
        transition-transform duration-100 ease-[cubic-bezier(0.16,1,0.3,1)]
        {checked ? 'translate-x-6 bg-black text-white' : 'translate-x-0'}
      "
    >
      {checked ? 'ON' : 'OFF'}
    </div>
  </div>

  {#if label}
    <span class="font-mono text-xs font-bold uppercase tracking-wider text-black dark:text-white">
      {label}
    </span>
  {/if}
</label>

<script lang="ts">
  import { Switch } from '@ark-ui/svelte/switch';
  import { triggerHaptic } from '$lib/design-system/tokens';

  interface Props {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    class?: string;
  }

  let {
    checked = $bindable(false),
    onCheckedChange,
    label,
    disabled = false,
    class: className = '',
  }: Props = $props();

  function handleCheckedChange(details: { checked: boolean }) {
    triggerHaptic('light');
    checked = details.checked;
    onCheckedChange?.(details.checked);
  }
</script>

<Switch.Root
  bind:checked
  {disabled}
  onCheckedChange={handleCheckedChange}
  class="inline-flex items-center gap-3 cursor-pointer select-none {className}"
>
  <Switch.Control
    class="
      w-11 h-6 rounded-full p-0.5 border border-zinc-300 dark:border-zinc-700/80 transition-colors duration-200
      data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-400
      data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-800
    "
  >
    <Switch.Thumb
      class="
        w-4.5 h-4.5 rounded-full bg-white shadow-md block transition-transform duration-200
        data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0
      "
    />
  </Switch.Control>
  <Switch.HiddenInput />
  {#if label}
    <Switch.Label class="text-xs sm:text-sm font-sans font-medium text-zinc-700 dark:text-zinc-300">
      {label}
    </Switch.Label>
  {/if}
</Switch.Root>

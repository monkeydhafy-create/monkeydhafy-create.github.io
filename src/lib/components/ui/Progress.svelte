<script lang="ts">
  import { Progress } from '@ark-ui/svelte/progress';

  interface Props {
    value?: number;
    max?: number;
    label?: string;
    variant?: 'emerald' | 'cyan' | 'violet';
    class?: string;
  }

  let {
    value = 50,
    max = 100,
    label,
    variant = 'emerald',
    class: className = '',
  }: Props = $props();

  const variantGradients = {
    emerald: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    cyan: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    violet: 'bg-gradient-to-r from-violet-500 to-purple-500',
  };
</script>

<Progress.Root {value} {max} class="w-full {className}">
  {#if label}
    <div class="flex justify-between items-center mb-1.5 font-mono text-xs">
      <Progress.Label class="text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">{label}</Progress.Label>
      <Progress.ValueText class="text-zinc-900 dark:text-zinc-200 font-bold">{value}%</Progress.ValueText>
    </div>
  {/if}

  <Progress.Track class="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-300/50 dark:border-zinc-700/50">
    <Progress.Range class="h-full rounded-full transition-all duration-300 ease-out {variantGradients[variant]}" />
  </Progress.Track>
</Progress.Root>

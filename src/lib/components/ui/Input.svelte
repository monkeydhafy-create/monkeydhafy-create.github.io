<script lang="ts">
  interface Props {
    label?: string;
    placeholder?: string;
    value?: string;
    type?: 'text' | 'email' | 'password' | 'number';
    disabled?: boolean;
    error?: string;
    helperText?: string;
    prefix?: string;
    oninput?: (e: Event) => void;
    class?: string;
  }

  let {
    label,
    placeholder = 'Nhập thông tin...',
    value = $bindable(''),
    type = 'text',
    disabled = false,
    error,
    helperText,
    prefix,
    oninput,
    class: className = '',
  }: Props = $props();

  const inputId = `kairos-input-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="w-full {className}">
  {#if label}
    <label for={inputId} class="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
      {label}
    </label>
  {/if}

  <div
    class="
      relative flex items-center bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden
      transition-colors duration-150
      {error ? 'border-rose-500/80 focus-within:ring-1 focus-within:ring-rose-500' : 'border-zinc-300 dark:border-zinc-800 focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-500/30 dark:focus-within:ring-emerald-400/20'}
    "
  >
    {#if prefix}
      <span class="pl-3 text-xs font-mono text-zinc-400 dark:text-zinc-500 select-none">
        {prefix}
      </span>
    {/if}

    <!-- Font-size text-base on mobile prevents iOS Safari auto-zoom (Rule 04) -->
    <input
      id={inputId}
      {type}
      {disabled}
      bind:value
      {placeholder}
      {oninput}
      class="
        w-full px-3 py-2.5 bg-transparent font-sans text-base sm:text-sm text-zinc-900 dark:text-zinc-100
        placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none disabled:opacity-50
      "
    />
  </div>

  {#if error}
    <p class="text-xs text-rose-400 mt-1 font-sans">{error}</p>
  {:else if helperText}
    <p class="text-xs text-zinc-500 mt-1 font-sans">{helperText}</p>
  {/if}
</div>

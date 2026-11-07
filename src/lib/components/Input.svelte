<script lang="ts">
  interface Props {
    label?: string;
    prefix?: string;
    value?: string;
    placeholder?: string;
    type?: 'text' | 'password' | 'email' | 'number';
    disabled?: boolean;
    oninput?: (e: Event) => void;
    class?: string;
  }

  let {
    label,
    prefix = 'KEY >',
    value = $bindable(''),
    placeholder = 'Nhập dữ liệu...',
    type = 'text',
    disabled = false,
    oninput,
    class: className = '',
  }: Props = $props();

  const inputId = `input-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="w-full {className}">
  {#if label}
    <label for={inputId} class="block font-mono text-xs font-bold uppercase tracking-wider mb-1.5 text-black dark:text-white">
      {label}
    </label>
  {/if}

  <div class="flex border-[3px] md:border-[4px] border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFF] bg-white dark:bg-[#141414] overflow-hidden transition-colors duration-150">
    {#if prefix}
      <div class="bg-[#FFE600] text-black font-mono font-bold text-xs uppercase px-3 py-3 flex items-center border-r-[3px] md:border-r-[4px] border-black dark:border-white select-none">
        {prefix}
      </div>
    {/if}

    <!-- Font-size text-base on mobile prevents iOS Safari auto-zoom on input focus -->
    <input
      id={inputId}
      {type}
      {disabled}
      bind:value
      {placeholder}
      {oninput}
      class="flex-1 px-3 py-3 font-mono text-base md:text-sm bg-transparent text-black dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none min-h-[48px] md:min-h-[42px] disabled:opacity-50"
    />
  </div>
</div>

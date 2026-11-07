<script lang="ts">
  import { fly } from 'svelte/transition';
  import { triggerHaptic } from '$lib/design-system/tokens';

  interface Props {
    visible?: boolean;
    title?: string;
    message?: string;
    type?: 'success' | 'warning' | 'error' | 'info';
    duration?: number;
    onclose?: () => void;
  }

  let {
    visible = $bindable(false),
    title = 'SYSTEM NOTIFICATION',
    message = 'Thao tác đã được thực thi thành công.',
    type = 'success',
    duration = 4000,
    onclose,
  }: Props = $props();

  const typeConfig = {
    success: {
      border: 'border-emerald-500/40',
      icon: '✔',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    },
    warning: {
      border: 'border-amber-500/40',
      icon: '⚠',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    },
    error: {
      border: 'border-rose-500/40',
      icon: '✖',
      iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
    },
    info: {
      border: 'border-cyan-500/40',
      icon: 'ℹ',
      iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
    },
  };

  $effect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        close();
      }, duration);
      return () => clearTimeout(timer);
    }
  });

  function close() {
    triggerHaptic('light');
    visible = false;
    onclose?.();
  }
</script>

{#if visible}
  <!-- Rule 09: Dynamic Island Top-Anchored Toast -->
  <div
    role="alert"
    transition:fly={{ y: -24, duration: 180 }}
    class="
      fixed z-[350]
      top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 sm:max-w-sm sm:w-full
      p-4 rounded-xl border shadow-2xl backdrop-blur-md
      bg-white/95 dark:bg-zinc-900/95
      flex items-start justify-between gap-3
      {typeConfig[type].border}
    "
  >
    <div class="flex items-start gap-3">
      <span class="w-6 h-6 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0 {typeConfig[type].iconBg}">
        {typeConfig[type].icon}
      </span>
      <div>
        <div class="font-sans font-semibold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 leading-snug">
          {title}
        </div>
        <div class="font-sans text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
          {message}
        </div>
      </div>
    </div>

    <button
      type="button"
      onclick={close}
      class="text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 text-xs w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer"
    >
      ✕
    </button>
  </div>
{/if}

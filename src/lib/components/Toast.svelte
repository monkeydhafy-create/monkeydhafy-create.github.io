<script lang="ts">
  import { triggerHaptic } from '$lib/constants/tokens';

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
    title = 'SYSTEM ALERT',
    message = 'Thao tác đã được thực thi thành công.',
    type = 'success',
    duration = 4000,
    onclose,
  }: Props = $props();

  const typeConfig = {
    success: { bg: 'bg-[#00FF66]', border: 'border-black', icon: '✔' },
    warning: { bg: 'bg-[#FFE600]', border: 'border-black', icon: '⚠' },
    error: { bg: 'bg-[#FF007A]', border: 'border-black', icon: '✖' },
    info: { bg: 'bg-[#00F0FF]', border: 'border-black', icon: 'ℹ' },
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
    triggerHaptic('lightTap');
    visible = false;
    onclose?.();
  }
</script>

{#if visible}
  <!-- Responsive Placement: Mobile Bottom Floating vs Desktop Top Right -->
  <div
    role="alert"
    class="
      fixed z-[300]
      /* Mobile: Floating near bottom safe area */
      bottom-6 left-4 right-4 md:bottom-auto md:left-auto md:right-6 md:top-6 md:max-w-sm md:w-full
      p-4 border-[3px] md:border-[4px] border-black dark:border-white
      shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFF] md:shadow-[6px_6px_0px_#000] md:dark:shadow-[6px_6px_0px_#FFF]
      {typeConfig[type].bg} text-black
      flex items-start justify-between gap-3
      transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
    "
  >
    <div class="flex items-start gap-2.5">
      <span class="w-6 h-6 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white flex items-center justify-center font-mono font-black text-xs shrink-0">
        {typeConfig[type].icon}
      </span>
      <div>
        <div class="font-sans font-black text-sm uppercase tracking-tight leading-none mb-1 text-black">
          {title}
        </div>
        <div class="font-sans text-xs font-semibold leading-relaxed text-black">
          {message}
        </div>
      </div>
    </div>

    <button
      type="button"
      onclick={close}
      class="w-6 h-6 border-2 border-black dark:border-white bg-white dark:bg-[#141414] text-black dark:text-white flex items-center justify-center font-mono font-black text-xs shadow-[1px_1px_0px_#000] dark:shadow-[1px_1px_0px_#FFF] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shrink-0"
    >
      ✕
    </button>
  </div>
{/if}

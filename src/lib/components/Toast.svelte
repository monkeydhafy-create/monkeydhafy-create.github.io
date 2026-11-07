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
    success: {
      classes: 'bg-[#00FF66] text-black border-black shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] dark:bg-[#04200E] dark:text-[#00FF7F] dark:border-white dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
      icon: '✔',
      iconBox: 'bg-black text-white dark:bg-[#00FF7F] dark:text-black border-black dark:border-white',
      closeBtn: 'dark:bg-[#04200E] dark:text-[#00FF7F] dark:border-white dark:shadow-[1px_1px_0px_#FFFFFF]'
    },
    warning: {
      classes: 'bg-[#FFE600] text-black border-black shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] dark:bg-[#1C1900] dark:text-[#FFE600] dark:border-white dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
      icon: '⚠',
      iconBox: 'bg-black text-white dark:bg-[#FFE600] dark:text-black border-black dark:border-white',
      closeBtn: 'dark:bg-[#1C1900] dark:text-[#FFE600] dark:border-white dark:shadow-[1px_1px_0px_#FFFFFF]'
    },
    error: {
      classes: 'bg-[#FF007A] text-white border-black shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] dark:bg-[#200412] dark:text-[#FF1A8C] dark:border-white dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
      icon: '✖',
      iconBox: 'bg-black text-white dark:bg-[#FF1A8C] dark:text-black border-black dark:border-white',
      closeBtn: 'dark:bg-[#200412] dark:text-[#FF1A8C] dark:border-white dark:shadow-[1px_1px_0px_#FFFFFF]'
    },
    info: {
      classes: 'bg-[#00F0FF] text-black border-black shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] dark:bg-[#031C20] dark:text-[#00F0FF] dark:border-white dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
      icon: 'ℹ',
      iconBox: 'bg-black text-white dark:bg-[#00F0FF] dark:text-black border-black dark:border-white',
      closeBtn: 'dark:bg-[#031C20] dark:text-[#00F0FF] dark:border-white dark:shadow-[1px_1px_0px_#FFFFFF]'
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
      p-4 border-[3px] md:border-[4px]
      {typeConfig[type].classes}
      flex items-start justify-between gap-3
      transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
    "
  >
    <div class="flex items-start gap-2.5">
      <span class="w-6 h-6 border flex items-center justify-center font-mono font-black text-xs shrink-0 {typeConfig[type].iconBox}">
        {typeConfig[type].icon}
      </span>
      <div>
        <div class="font-sans font-black text-sm uppercase tracking-tight leading-none mb-1 text-current">
          {title}
        </div>
        <div class="font-sans text-xs font-semibold leading-relaxed text-current opacity-90">
          {message}
        </div>
      </div>
    </div>

    <button
      type="button"
      onclick={close}
      class="w-6 h-6 border-2 border-black bg-white text-black flex items-center justify-center font-mono font-black text-xs shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shrink-0 {typeConfig[type].closeBtn}"
    >
      ✕
    </button>
  </div>
{/if}

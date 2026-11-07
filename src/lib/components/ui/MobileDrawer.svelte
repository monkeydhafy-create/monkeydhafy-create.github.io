<script lang="ts">
  import { Dialog } from '@ark-ui/svelte/dialog';
  import { Portal } from '@ark-ui/svelte/portal';
  import { triggerHaptic } from '$lib/design-system/tokens';
  import Switch from './Switch.svelte';
  import Button from './Button.svelte';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    isDark: boolean;
    onToggleTheme: () => void;
    onOpenContact: () => void;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    isDark,
    onToggleTheme,
    onOpenContact,
  }: Props = $props();

  const links = [
    { href: '#pillars', label: '01 / KIẾN TRÚC', sub: '6 Trụ Cột Đảm Bảo Chất Lượng', icon: '🏛️' },
    { href: '#systems', label: '02 / HỆ THỐNG', sub: 'Go + DBOS + Tianji AI Vector', icon: '⚡' },
    { href: '#cases', label: '03 / CASE STUDIES', sub: 'Nghiên Cứu Điển Hình 1.2M RPS', icon: '💼' },
    { href: '#rules', label: '04 / DESIGN RULES', sub: '12 Điều Luật Bất Biến Kairos', icon: '📐' },
    { href: '#matrix', label: '05 / LAB MATRIX', sub: 'Phòng Thử Nghiệm Linh Kiện', icon: '🧪' },
  ];

  function handleNavigate(href: string) {
    triggerHaptic('light');
    open = false;
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  }

  function handleContact() {
    triggerHaptic('medium');
    open = false;
    setTimeout(() => {
      onOpenContact();
    }, 200);
  }
</script>

<Dialog.Root bind:open onOpenChange={(details) => { triggerHaptic('light'); open = details.open; onOpenChange?.(details.open); }}>
  <Portal>
    <!-- Dark Backdrop -->
    <Dialog.Backdrop
      class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity duration-200"
    />

    <!-- Mobile Slide-over Positioner -->
    <Dialog.Positioner
      class="fixed inset-y-0 right-0 z-[210] w-full max-w-xs flex justify-end pointer-events-none"
    >
      <Dialog.Content
        class="
          pointer-events-auto w-full h-[100dvh] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800
          p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] shadow-2xl flex flex-col justify-between overflow-y-auto
          overscroll-contain transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
        "
      >
        <!-- Top Drawer Header -->
        <div>
          <div class="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
                Z
              </div>
              <div class="leading-none">
                <span class="font-sans font-bold text-sm text-zinc-900 dark:text-zinc-100">ZERA</span>
                <span class="block font-mono text-[9px] text-zinc-500 dark:text-zinc-400">ARCHITECT MENU</span>
              </div>
            </div>

            <Dialog.CloseTrigger
              class="
                w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400
                hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-sm
              "
            >
              ✕
            </Dialog.CloseTrigger>
          </div>

          <!-- Section Navigation Links -->
          <nav class="mt-6 space-y-2">
            {#each links as link}
              <button
                type="button"
                onclick={() => handleNavigate(link.href)}
                class="
                  w-full text-left p-3 rounded-xl transition-all select-none cursor-pointer flex items-center gap-3
                  hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:scale-95 min-h-[48px]
                  border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700/60
                "
              >
                <span class="text-xl shrink-0">{link.icon}</span>
                <div>
                  <div class="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{link.label}</div>
                  <div class="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{link.sub}</div>
                </div>
              </button>
            {/each}
          </nav>
        </div>

        <!-- Bottom Drawer Actions & Controls -->
        <div class="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
          
          <!-- Theme Switcher Row -->
          <div class="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
            <span class="font-mono text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              {isDark ? '🌙 DARK MODE' : '☀️ LIGHT MODE'}
            </span>
            <Button variant="outline" size="sm" onclick={onToggleTheme}>
              ĐỔI GIAO DIỆN
            </Button>
          </div>

          <!-- Quick Contact CTA -->
          <Button variant="primary" class="w-full justify-center min-h-[44px]" onclick={handleContact}>
            ĐẶT LỊCH TƯ VẤN KIẾN TRÚC &rarr;
          </Button>

          <!-- Safe area footnote -->
          <div class="text-center font-mono text-[10px] text-zinc-400">
            KAIROS ARK MOBILE // 0ms LATENCY
          </div>
        </div>

      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>

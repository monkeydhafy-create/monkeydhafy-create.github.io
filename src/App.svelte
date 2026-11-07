<script lang="ts">
  import DesktopView from '$lib/views/DesktopView.svelte';
  import MobileView from '$lib/views/MobileView.svelte';

  // Quản lý theme toàn cục bằng Svelte 5 Runes
  let isDark = $state(false);
  
  // Preview mode: 'auto' | 'desktop' | 'mobile-frame'
  let previewMode = $state<'auto' | 'desktop' | 'mobile-frame'>('auto');

  function toggleTheme() {
    isDark = !isDark;
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }
</script>

<div class="min-h-screen bg-brutal-dots transition-colors duration-150">
  <!-- Floating Device Viewport Controller (Để test ngay trên Desktop) -->
  <aside 
    class="fixed top-3 right-3 md:top-4 md:right-4 z-[300] bg-white dark:bg-black border-[3px] border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFF] p-1.5 flex items-center gap-1.5 font-mono text-[10px] md:text-xs font-black uppercase select-none"
    aria-label="Device Viewport Mode"
  >
    <span class="px-2 text-neutral-500 hidden sm:inline">VIEW:</span>
    <button
      type="button"
      onclick={() => previewMode = 'auto'}
      class="px-2.5 py-1 transition-colors cursor-pointer border border-transparent {previewMode === 'auto' ? 'bg-[#FFE600] text-black border-black font-extrabold shadow-[1px_1px_0px_#000]' : 'text-neutral-700 dark:text-neutral-300'}"
    >
      AUTO (RESPONSIVE)
    </button>
    <button
      type="button"
      onclick={() => previewMode = 'desktop'}
      class="px-2.5 py-1 transition-colors cursor-pointer border border-transparent {previewMode === 'desktop' ? 'bg-[#00F0FF] text-black border-black font-extrabold shadow-[1px_1px_0px_#000]' : 'text-neutral-700 dark:text-neutral-300'}"
    >
      DESKTOP
    </button>
    <button
      type="button"
      onclick={() => previewMode = 'mobile-frame'}
      class="px-2.5 py-1 transition-colors cursor-pointer border border-transparent {previewMode === 'mobile-frame' ? 'bg-[#FF007A] text-white border-black font-extrabold shadow-[1px_1px_0px_#000]' : 'text-neutral-700 dark:text-neutral-300'}"
    >
      PHONE FRAME
    </button>
  </aside>

  <!-- RENDERING LOGIC -->
  {#if previewMode === 'auto'}
    <!-- Responsive CSS: Tự động chia tách Desktop (lg:block) và Mobile (lg:hidden) -->
    <DesktopView {isDark} ontoggleTheme={toggleTheme} />
    <MobileView {isDark} ontoggleTheme={toggleTheme} />

  {:else if previewMode === 'desktop'}
    <!-- Cưỡng bức hiển thị Desktop View -->
    <div class="block">
      <DesktopView {isDark} ontoggleTheme={toggleTheme} />
    </div>

  {:else}
    <!-- Cưỡng bức hiển thị Mobile View trong Phone Frame trên màn hình lớn -->
    <div class="py-12 px-4 flex flex-col items-center justify-center min-h-screen">
      <div class="font-mono text-xs font-black uppercase mb-4 bg-black text-white px-4 py-1.5 shadow-[4px_4px_0px_#FFE600]">
        SIMULATING IPHONE 15 PRO VIEWPORT (390px × 844px)
      </div>

      <div class="w-[390px] h-[800px] border-[4px] border-black dark:border-white shadow-[12px_12px_0px_#000] dark:shadow-[12px_12px_0px_#FFF] rounded-[36px] overflow-hidden bg-white dark:bg-black relative">
        <div class="h-full overflow-y-auto">
          <!-- Force Mobile View inside Frame -->
          <div class="block">
            <MobileView {isDark} ontoggleTheme={toggleTheme} />
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

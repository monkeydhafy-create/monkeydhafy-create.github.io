<script lang="ts">
  import DesktopView from '$lib/views/DesktopView.svelte';
  import MobileView from '$lib/views/MobileView.svelte';

  // Quản lý theme toàn cục bằng Svelte 5 Runes
  let isDark = $state(false);

  // Đồng bộ theme với thẻ <html> ngay từ khi khởi tạo
  $effect(() => {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  });

  function toggleTheme() {
    isDark = !isDark;
  }
</script>

<div class="min-h-screen bg-brutal-dots transition-colors duration-150">
  <!-- Responsive CSS: Tự động chia tách Desktop (hidden lg:block) và Mobile (block lg:hidden) chuẩn mực -->
  <DesktopView {isDark} ontoggleTheme={toggleTheme} />
  <MobileView {isDark} ontoggleTheme={toggleTheme} />
</div>

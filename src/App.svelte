<script lang="ts">
  import PortfolioView from '$lib/views/PortfolioView.svelte';
  import ComponentsDemoView from '$lib/views/ComponentsDemoView.svelte';

  // Quản lý theme toàn cục bằng Svelte 5 Runes
  let isDark = $state(false);

  // Router trạng thái: 'portfolio' (Giới thiệu bản thân) | 'components' (Demo all components)
  let currentRoute = $state<'portfolio' | 'components'>('portfolio');

  // Khởi tạo và lắng nghe hash change trên trình duyệt
  $effect(() => {
    if (typeof window === 'undefined') return;

    function handleHashChange() {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('components') || hash.includes('lab') || hash.includes('demo')) {
        currentRoute = 'components';
      } else {
        currentRoute = 'portfolio';
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Đọc hash ban đầu
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

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

  function navigateTo(route: 'portfolio' | 'components') {
    currentRoute = route;
    if (typeof window !== 'undefined') {
      window.location.hash = route === 'components' ? '#/components' : '#/';
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
</script>

<div class="min-h-screen bg-brutal-dots transition-colors duration-150">
  {#if currentRoute === 'portfolio'}
    <PortfolioView {isDark} ontoggleTheme={toggleTheme} onnavigate={navigateTo} />
  {:else}
    <ComponentsDemoView {isDark} ontoggleTheme={toggleTheme} onnavigate={navigateTo} />
  {/if}
</div>

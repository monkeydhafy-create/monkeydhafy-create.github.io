<script lang="ts">
  import { onMount } from 'svelte';
  import { Terminal, ExternalLink, Menu, X, Cpu } from '@lucide/svelte';

  let isScrolled = $state(false);
  let mobileMenuOpen = $state(false);

  onMount(() => {
    const handleScroll = () => {
      isScrolled = window.scrollY > 20;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

<header class="sticky top-0 z-50 transition-all duration-300 {isScrolled ? 'backdrop-blur-md bg-[#080C14]/85 border-b border-slate-800/80 shadow-lg shadow-black/20' : 'bg-transparent border-b border-transparent'}">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    
    <!-- Brand -->
    <a href="#hero" class="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg p-1">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-slate-800 flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
        <img src="/logo_transparent.png" alt="EngBbq Platform Logo" class="w-full h-full object-contain" />
      </div>
      <div class="flex flex-col">
        <span class="font-bold text-base tracking-tight text-white flex items-center gap-1.5 font-mono">
          ZERA<span class="text-emerald-400">.IO</span>
        </span>
        <span class="text-[10px] text-slate-400 font-mono tracking-wider">SVELTE 5 // ENGBBQ.ME</span>
      </div>
    </a>

    <!-- Desktop Navigation -->
    <nav class="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300 font-sans">
      <a href="#hero" class="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/50 transition">Overview</a>
      <a href="#engbbq" class="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/50 transition flex items-center gap-1.5">
        <span>EngBbq Platform</span>
        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">DBOS</span>
      </a>
      <a href="#tianji" class="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/50 transition">Tianji AI</a>
      <a href="#architecture" class="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/50 transition">6 Pillars</a>
      <a href="#terminal" class="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/50 transition flex items-center gap-1.5">
        <Terminal class="w-3.5 h-3.5 text-emerald-400" />
        <span>Radar</span>
      </a>
      <a href="#contact" class="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/50 transition">Contact</a>
    </nav>

    <!-- Status & Actions -->
    <div class="hidden sm:flex items-center gap-3">
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-mono text-[11px]">Svelte 5 Reactive Engine</span>
      </div>

      <a href="https://github.com/monkeydhafy-create" target="_blank" rel="noopener noreferrer" 
         class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
        </svg>
        <span class="font-mono">GitHub</span>
      </a>
    </div>

    <!-- Mobile Hamburger Toggle -->
    <button 
      onclick={() => mobileMenuOpen = !mobileMenuOpen} 
      class="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
      aria-label="Toggle Navigation Menu">
      {#if mobileMenuOpen}
        <X class="w-5 h-5" />
      {:else}
        <Menu class="w-5 h-5" />
      {/if}
    </button>
  </div>

  <!-- Mobile Dropdown Menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden px-4 pt-2 pb-4 bg-[#080C14]/95 border-b border-slate-800 space-y-2 backdrop-blur-lg">
      <a href="#hero" onclick={() => mobileMenuOpen = false} class="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Overview</a>
      <a href="#engbbq" onclick={() => mobileMenuOpen = false} class="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">EngBbq Platform</a>
      <a href="#tianji" onclick={() => mobileMenuOpen = false} class="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Tianji AI Hermeneutics</a>
      <a href="#architecture" onclick={() => mobileMenuOpen = false} class="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">6 Pillars Architecture</a>
      <a href="#terminal" onclick={() => mobileMenuOpen = false} class="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Live Terminal</a>
      <a href="#contact" onclick={() => mobileMenuOpen = false} class="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Contact</a>
    </div>
  {/if}
</header>

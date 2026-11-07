<script lang="ts">
  import Navbar from './components/Navbar.svelte';
  import Hero from './components/Hero.svelte';
  import EngBbqShowcase from './components/EngBbqShowcase.svelte';
  import TianjiShowcase from './components/TianjiShowcase.svelte';
  import SixPillars from './components/SixPillars.svelte';
  import InteractiveTerminal from './components/InteractiveTerminal.svelte';
  import Footer from './components/Footer.svelte';
</script>

<div class="relative min-h-screen bg-[#080C14] text-slate-100 font-sans antialiased overflow-x-hidden">
  <!-- Ambient Background Lighting -->
  <div class="fixed top-0 left-0 right-0 h-[600px] radial-glow pointer-events-none -z-10"></div>
  <div class="fixed inset-0 bg-grid-pattern pointer-events-none -z-20"></div>

  <!-- Header & Navigation -->
  <Navbar />

  <!-- Main Sections -->
  <main>
    <Hero />
    <EngBbqShowcase />
    <TianjiShowcase />
    <SixPillars />
    <InteractiveTerminal />
  </main>

  <!-- Footer -->
  <Footer />
</div>

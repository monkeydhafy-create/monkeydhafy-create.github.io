<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Sparkles, Terminal, Activity, Layers, ShieldCheck, Zap } from '@lucide/svelte';

  const metrics = [
    { label: 'Durable Workflows', value: '100%', sub: 'Zero Lost State (DBOS)', icon: Layers },
    { label: 'Core P99 Latency', value: '< 15ms', sub: 'High-Throughput Go', icon: Zap },
    { label: 'AI Corpus Size', value: '8.77M+', sub: 'Tianji AI Hermeneutics', icon: Sparkles },
    { label: 'Security Model', value: 'Zero Trust', sub: 'Cloudflare 6-Phase Pipeline', icon: ShieldCheck },
  ];

  let typingText = $state('Durable Workflows');
  const titles = ['Durable Workflows', 'Cognitive AI', 'Distributed Systems', 'Bare-Metal Automation'];
  let titleIndex = 0;

  onMount(() => {
    const interval = setInterval(() => {
      titleIndex = (titleIndex + 1) % titles.length;
      typingText = titles[titleIndex];
    }, 2800);
    return () => clearInterval(interval);
  });
</script>

<section id="hero" class="relative pt-20 pb-20 md:pt-28 md:pb-32 overflow-hidden">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <div class="max-w-3xl">
      <!-- Badge with live pulse -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-6">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        Principal Solutions Architect & AI Engineering Lead
      </div>

      <!-- Main Headline with Svelte 5 Dynamic Title -->
      <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
        Engineering Resilient <br class="hidden sm:inline" />
        <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
          {typingText}
        </span><br />
        & Distributed Platforms.
      </h1>

      <!-- Subtitle -->
      <p class="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal mb-10 max-w-2xl">
        Architecting fault-tolerant software at the intersection of <strong class="text-white font-medium">durable workflow engines (DBOS in Go)</strong>, behavioral cognitive science models, and high-performance in-browser client runtimes with <strong class="text-emerald-400 font-mono font-medium">Svelte 5</strong>.
      </p>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-4">
        <a href="#engbbq" class="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm tracking-wide transition shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <span>Explore EngBbq Platform</span>
          <ArrowRight class="w-4 h-4" />
        </a>

        <a href="#terminal" class="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 hover:border-slate-500 transition focus:outline-none focus:ring-2 focus:ring-slate-400">
          <Terminal class="w-4 h-4 text-emerald-400" />
          <span class="font-mono">Interactive Radar</span>
        </a>
      </div>

      <!-- Metrics Grid -->
      <div class="mt-14 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6">
        {#each metrics as m}
          <div class="space-y-1">
            <div class="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <m.icon class="w-3.5 h-3.5 text-emerald-400" />
              <span>{m.label}</span>
            </div>
            <div class="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {m.value}
            </div>
            <div class="text-[11px] text-slate-500 font-mono">{m.sub}</div>
          </div>
        {/each}
      </div>

    </div>

  </div>
</section>

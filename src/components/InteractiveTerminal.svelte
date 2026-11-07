<script lang="ts">
  import { Terminal, Send, CornerDownLeft } from '@lucide/svelte';

  interface HistoryItem {
    type: 'input' | 'output' | 'error';
    text: string;
  }

  let inputVal = $state('');
  let history = $state<HistoryItem[]>([
    { type: 'output', text: 'EngBbq System Telemetry Radar [v2.4.0-svelte5]' },
    { type: 'output', text: 'Type "help" to view available diagnostic commands.' }
  ]);

  let terminalContainer: HTMLDivElement | null = $state(null);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    history.push({ type: 'input', text: `➜ ~ ${trimmed}` });
    const lower = trimmed.toLowerCase();

    switch (lower) {
      case 'help':
        history.push({ type: 'output', text: 'Available commands:\n  status   - Check current production health\n  engbbq   - Inspect EngBbq cognitive framework\n  tianji   - Inspect Tianji AI 8.77M dataset\n  stack    - Print active languages & runtimes\n  clear    - Clear terminal buffer\n  whoami   - Display active engineer identity' });
        break;

      case 'status':
        history.push({ type: 'output', text: '[OK] Host: engbbq.me (GitHub Pages Edge CDN)\n[OK] Engine: Svelte 5 (Runes Reactive Core)\n[OK] Backend: Go Microservices with DBOS SDK\n[OK] P99 Latency: 11.4ms | Zero-Trust Pipeline: Active' });
        break;

      case 'engbbq':
        history.push({ type: 'output', text: 'Platform: EngBbq (https://engbbq.me)\nFocus: Adaptive English Learning for Vietnamese Learners\nCore Pillars: Effort Paradox (A), Avoidance (B), Fear of Judgment (C), Identity Crisis (D)\nStack: Go + DBOS, Flutter, MariaDB, Redis, GCP BigQuery, HyperFrames' });
        break;

      case 'tianji':
        history.push({ type: 'output', text: 'Tianji AI Hermeneutics Engine:\nCorpus: 8,771,688 Interpretations (v4.0, 56.6 GB)\nPatterns: 1100+ Classical Patterns (Tử Vi Đẩu Số Toàn Thư / Cốt Tủy Phú)\nModel: Gemini 3.8 Flash High (100% Tiếng Việt chuẩn mực)' });
        break;

      case 'stack':
        history.push({ type: 'output', text: 'Primary Tech Stack:\n  • Languages: Go (Golang), TypeScript, Dart, Python, Rust\n  • Frameworks: Svelte 5, Flutter, DBOS Durable SDK, Vite 8\n  • Data & Infra: MariaDB, Redis, BigQuery, Docker, Win32 CDP' });
        break;

      case 'whoami':
        history.push({ type: 'output', text: 'Zera — Principal Solutions Architect & AI Engineering Lead\nOrganization: EngBbq Platform (github.com/monkeydhafy-create)' });
        break;

      case 'clear':
        history = [];
        break;

      default:
        history.push({ type: 'error', text: `command not found: "${trimmed}". Type "help" for a list of commands.` });
        break;
    }

    inputVal = '';
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    }
  };
</script>

<section id="terminal" class="py-20 border-t border-slate-800/80 relative">
  <div class="max-w-4xl mx-auto px-4 sm:px-6">
    
    <div class="text-center mb-8">
      <span class="text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
        <Terminal class="w-3.5 h-3.5" />
        <span>Interactive Telemetry Radar</span>
      </span>
      <h2 class="text-2xl sm:text-3xl font-bold text-white mt-1">Live Svelte 5 Console</h2>
      <p class="text-slate-400 text-xs sm:text-sm mt-1">
        Thử gõ <code class="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">status</code>, <code class="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">engbbq</code>, hoặc <code class="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">help</code> để tương tác với hệ thống.
      </p>
    </div>

    <!-- Terminal Box -->
    <div class="rounded-2xl overflow-hidden border border-slate-800 bg-[#080C14] shadow-2xl font-mono text-xs sm:text-sm">
      
      <!-- Terminal Bar -->
      <div class="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
          <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
          <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
        </div>
        <span class="text-slate-400 text-xs">zera@engbbq-terminal: ~ (zsh / svelte-5)</span>
        <div class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          ONLINE
        </div>
      </div>

      <!-- Terminal Screen -->
      <div bind:this={terminalContainer} class="p-5 sm:p-6 space-y-2 max-h-80 overflow-y-auto leading-relaxed">
        {#each history as item}
          {#if item.type === 'input'}
            <div class="text-slate-200 font-bold">{item.text}</div>
          {:else if item.type === 'error'}
            <div class="text-rose-400 whitespace-pre-wrap">{item.text}</div>
          {:else}
            <div class="text-slate-400 whitespace-pre-wrap">{item.text}</div>
          {/if}
        {/each}

        <!-- Active Input Line -->
        <div class="flex items-center gap-2 pt-2 text-slate-100">
          <span class="text-emerald-400 font-bold">➜</span>
          <span class="text-sky-400">~</span>
          <input 
            type="text" 
            bind:value={inputVal} 
            onkeydown={handleKey}
            placeholder="Type a command (help, status, engbbq, stack, clear)..."
            class="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder:text-slate-600 focus:ring-0 text-xs sm:text-sm"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
      </div>

    </div>

  </div>
</section>

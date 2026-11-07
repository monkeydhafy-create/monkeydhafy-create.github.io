<script lang="ts">
  import { Brain, Sparkles, Layers, Cpu, Play, CheckCircle2, ChevronRight, Activity } from '@lucide/svelte';

  const barriers = [
    {
      id: 'A',
      title: '01. Effort Paradox (Chăm chỉ vô hiệu)',
      problem: 'Ảo tưởng về năng lực do nhận diện thụ động (Passive Recognition), học nhiều nhưng không nói được.',
      solution: 'Adaptive Output Pipeline: Ép chuyển đổi sang L1 → L2 Active Recall (sản xuất ngôn ngữ chủ động).',
      metric: '+74% Active Recall Speed',
      color: 'emerald'
    },
    {
      id: 'B',
      title: '02. Emotional Avoidance (Trì hoãn né tránh)',
      problem: 'Né tránh các bài luyện nói có độ khó cao, bỏ ngang phiên học khi áp lực tăng.',
      solution: 'Fogg Behavior Model (B = MAP): Thuật toán tự động giảm tải task hoặc chuyển sang 60s micro-recovery.',
      metric: '91% Session Retention',
      color: 'sky'
    },
    {
      id: 'C',
      title: '03. Fear of Judgment (Sợ phán xét / FLA)',
      problem: 'Foreign Language Anxiety (FLA): Sợ bị chê phát âm sai, co cụm không dám nói to.',
      solution: 'Anti-Shame Loop: Shadowing → Read Aloud → Short Dialogue với AI chấm điểm không trừng phạt.',
      metric: '0% Shame Rating / Non-punitive',
      color: 'purple'
    },
    {
      id: 'D',
      title: '04. Motivation Crisis (Khủng hoảng bản ngã)',
      problem: 'Chỉ học vì điểm số tức thời, thiếu gắn kết với hình tượng bản thân trong tương lai.',
      solution: 'Ideal L2 Self Activation: Kết nối trực tiếp bài tập với ngữ cảnh giao tiếp thực chiến tương lai.',
      metric: '3.4x Long-Term Motivation',
      color: 'amber'
    }
  ];

  let selectedId = $state('A');
  let selectedBarrier = $derived(barriers.find(b => b.id === selectedId) || barriers[0]);
</script>

<section id="engbbq" class="py-20 bg-slate-900/40 border-t border-slate-800/80 relative">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Section Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-12">
      <div>
        <span class="text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Brain class="w-3.5 h-3.5" />
          <span>Flagship Architecture</span>
        </span>
        <h2 class="text-3xl sm:text-4xl font-bold text-white mt-1">
          EngBbq Platform — Cognitive AI & Durable Workflows
        </h2>
      </div>
      <p class="text-slate-400 text-sm max-w-md mt-3 md:mt-0 font-normal">
        Nền tảng thích ứng đột phá phá vỡ 4 rào cản tâm lý thụ đắc ngôn ngữ cho người Việt.
      </p>
    </div>

    <!-- Main Card -->
    <div class="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-[#080C14] border border-slate-800 p-6 sm:p-10 mb-8 transition hover:border-slate-700 shadow-2xl">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        <!-- Left: Cognitive Framework Interactive Switcher -->
        <div class="lg:col-span-7 space-y-6">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">Core Architecture</span>
            <span class="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono">Go + DBOS SDK</span>
            <span class="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono">Flutter Mobile App</span>
          </div>

          <h3 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            The 4-Pillar Behavioral Cognitive Engine
          </h3>

          <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
            Ứng dụng mô hình tâm lý học nhận thức tích hợp sâu vào mã nguồn backend. Bấm vào từng nhóm bên dưới để xem cơ chế giải quyết của hệ thống:
          </p>

          <!-- Interactive Barrier Buttons (Svelte 5 Runes) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {#each barriers as b}
              <button 
                onclick={() => selectedId = b.id}
                class="px-3 py-2.5 rounded-xl text-left border text-xs font-mono transition-all flex flex-col justify-between {selectedId === b.id ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'}">
                <span class="font-bold text-[11px] block">Nhóm {b.id}</span>
                <span class="truncate mt-1 text-[10px] text-slate-400">{b.title.split(' ')[1]}</span>
              </button>
            {/each}
          </div>

          <!-- Dynamic Detail Box -->
          <div class="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-emerald-400">{selectedBarrier.title}</span>
              <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">{selectedBarrier.metric}</span>
            </div>
            <div class="text-xs text-slate-400 leading-relaxed">
              <strong class="text-slate-300">Rào cản:</strong> {selectedBarrier.problem}
            </div>
            <div class="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
              <strong class="text-emerald-400">Giải pháp Hệ thống:</strong> {selectedBarrier.solution}
            </div>
          </div>

          <!-- Tech Specs Tags -->
          <div class="flex flex-wrap gap-2 pt-2">
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">Go (Golang)</span>
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">DBOS Durable Workflow</span>
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">Flutter / Dart Client</span>
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">MariaDB & Redis</span>
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">HyperFrames Render</span>
          </div>
        </div>

        <!-- Right: Authentic Logo & Audio Loop Preview -->
        <div class="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-950/90 rounded-2xl border border-slate-800">
          <div class="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-sky-500/10 to-transparent rounded-full blur-2xl"></div>
            <img src="/logo_transparent.png" alt="EngBbq Mascot Logo" class="relative z-10 w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 duration-300" />
          </div>

          <div class="text-center mt-4 space-y-1">
            <div class="text-base font-bold text-white font-mono tracking-tight">ENGBBQ.ME</div>
            <div class="text-xs text-slate-400 font-mono">Durable Architecture · Production Ready</div>
          </div>

          <!-- Simulated Audio Waveform -->
          <div class="w-full mt-6 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Activity class="w-4 h-4 animate-pulse" />
            </div>
            <div class="flex-1 flex items-center gap-1 h-6 px-1">
              {#each [30, 60, 45, 90, 75, 40, 85, 95, 60, 40, 70, 50, 80, 65, 90, 45, 60, 85, 40, 70, 95, 50] as h}
                <span class="flex-1 bg-emerald-500/40 rounded-full transition-all duration-300 hover:bg-emerald-400" style="height: {h}%"></span>
              {/each}
            </div>
            <span class="text-[10px] font-mono text-slate-400">AI Eval</span>
          </div>
        </div>

      </div>
    </div>

  </div>
</section>

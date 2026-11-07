<script lang="ts">
  import { triggerHaptic } from '$lib/design-system/tokens';

  interface HistoryItem {
    type: 'input' | 'output' | 'error';
    text: string;
  }

  let terminalInput = $state('');
  let history = $state<HistoryItem[]>([
    { type: 'output', text: 'Zera Distributed Telemetry Console [v3.0.0-ark]' },
    { type: 'output', text: 'Type "help" to inspect system architecture, tech stack & AI models.' },
  ]);

  const commandResponses: Record<string, string> = {
    help: `DANH SÁCH LỆNH KHẢ DỤNG:
  • bio           - Hồ sơ năng lực & kinh nghiệm kiến trúc sư
  • stack         - Khung công nghệ phân tán (Go, Svelte 5, DBOS, Ark UI)
  • tianji        - Kho ngữ liệu Vector 8.77M đoạn luận giải v4.0 (56.6 GB)
  • architecture  - 6 trụ cột thiết kế hệ thống phân tán chịu tải cao
  • rules         - 12 điều luật thiết kế Kairos Design System
  • clear         - Xóa sạch màn hình console`,
    bio: `ZERA — PRINCIPAL SOLUTIONS ARCHITECT & AI ENGINEERING LEAD
  • Chuyên môn: Distributed Systems, High-Performance Computing, AI/ML Engineering
  • Kinh nghiệm: Thiết kế luồng dữ liệu phân tán xử lý hàng triệu RPS, Zero-Downtime
  • Triết lý: First Principles (Phân rã vấn đề từ gốc rễ vật lý & toán học)`,
    stack: `TECH STACK CỐT LÕI:
  • Backend: Go (Golang), DBOS Durable Workflows, Temporal, Kafka, Raft Consensus
  • Frontend: Svelte 5 (Runes), Ark UI (Zag.js Finite State Machines), Tailwind CSS v4
  • AI/ML: Semantic Vector Search, Gemini 3.8 Flash/Pro, Model Routing & Caching
  • Infra: Cloudflare Workers Edge, Kubernetes, PostgreSQL, ClickHouse, Docker`,
    tianji: `TIANJI VECTOR CORPUS V4.0:
  • Quy mô: 8.77 triệu đoạn luận giải Tử Vi Đẩu Số & Thuật Số Chính Tông
  • Dung lượng: 56.6 GB vector embeddings
  • Tốc độ truy vấn: < 4ms qua HNSW index và binary quantization`,
    architecture: `6 TRỤ CỘT KIẾN TRÚC HỆ THỐNG (QUALITY ATTRIBUTES):
  1. Scalability: Khả năng mở rộng ngang chịu tải hàng triệu user
  2. Performance: Độ trễ siêu thấp (Low Latency), tối ưu tài nguyên
  3. Reliability: Tính sẵn sàng cao (High Availability), tự phục hồi (Self-healing)
  4. Security: Bảo mật Zero Trust, mã hóa đa lớp
  5. Cost-efficiency: Tối ưu chi phí vận hành TCO trên Cloud
  6. Observability: Giám sát toàn diện (Tracing, Metrics, Structured slog)`,
    rules: `KAIROS DESIGN SYSTEM (ARK UI × SVELTE 5):
  • 12 Iron Rules: FSM State Machine, Hairline 1px, 12-Step Zinc, Mobile Anti-Zoom, Vietnamese Diacritics...
  • Xem chi tiết tại tab "TIÊU CHUẨN DESIGN SYSTEM" trên trang.`,
  };

  function executeCommand(rawCmd: string) {
    const cmd = rawCmd.trim().toLowerCase();
    if (!cmd) return;

    triggerHaptic('light');
    history.push({ type: 'input', text: `➜ ~ ${rawCmd}` });

    if (cmd === 'clear') {
      history = [{ type: 'output', text: 'Console cleared.' }];
    } else if (commandResponses[cmd]) {
      history.push({ type: 'output', text: commandResponses[cmd] });
    } else {
      history.push({
        type: 'error',
        text: `Lệnh "${rawCmd}" không tồn tại. Gõ "help" để xem danh sách lệnh.`,
      });
    }

    terminalInput = '';
  }
</script>

<div class="rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-xs shadow-xl">
  <!-- Top Bar -->
  <div class="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
      <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
      <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
      <span class="text-zinc-600 dark:text-zinc-400 ml-2 text-[11px] font-medium select-none">zera@engbbq:~ (ark-runtime)</span>
    </div>
    <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 dark:border-emerald-500/20">
      LIVE TELEMETRY
    </span>
  </div>

  <!-- Terminal Output History -->
  <div class="p-4 space-y-2 max-h-72 overflow-y-auto font-mono text-xs leading-relaxed select-text">
    {#each history as item}
      {#if item.type === 'input'}
        <div class="text-emerald-400 font-semibold">{item.text}</div>
      {:else if item.type === 'error'}
        <div class="text-rose-400">{item.text}</div>
      {:else}
        <div class="text-zinc-300 whitespace-pre-wrap">{item.text}</div>
      {/if}
    {/each}
  </div>

  <!-- Command Input Form (Rule 04: min font-size 16px on mobile) -->
  <form
    onsubmit={(e) => { e.preventDefault(); executeCommand(terminalInput); }}
    class="px-4 py-2.5 bg-zinc-900/40 border-t border-zinc-800/80 flex items-center gap-2"
  >
    <span class="text-emerald-400 font-bold select-none">➜ ~</span>
    <input
      type="text"
      bind:value={terminalInput}
      placeholder="Gõ 'help', 'bio', 'stack', 'tianji', 'architecture'..."
      class="flex-1 bg-transparent text-zinc-100 outline-none text-base sm:text-xs font-mono placeholder:text-zinc-600"
    />
  </form>

  <!-- Quick Action Chips -->
  <div class="px-4 py-2 bg-zinc-900/60 border-t border-zinc-800/60 flex flex-wrap gap-1.5 text-[11px]">
    <span class="text-zinc-500 mr-1 select-none">Lệnh nhanh:</span>
    {#each ['bio', 'stack', 'tianji', 'architecture', 'rules', 'clear'] as quickCmd}
      <button
        type="button"
        onclick={() => executeCommand(quickCmd)}
        class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors cursor-pointer"
      >
        {quickCmd}
      </button>
    {/each}
  </div>
</div>

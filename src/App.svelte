<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Tabs from '$lib/components/ui/Tabs.svelte';
  import Accordion from '$lib/components/ui/Accordion.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Tooltip from '$lib/components/ui/Tooltip.svelte';
  import Switch from '$lib/components/ui/Switch.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';
  import Terminal from '$lib/components/ui/Terminal.svelte';
  import MobileDrawer from '$lib/components/ui/MobileDrawer.svelte';
  import { KAIROS_DESIGN_RULES } from '$lib/design-system/rules';
  import { triggerHaptic } from '$lib/design-system/tokens';

  // Theme Management (Default Dark for High-Tech OLED aesthetic)
  let isDark = $state(true);
  let isMobileDrawerOpen = $state(false);

  // Modal & Toast States
  let isContactModalOpen = $state(false);
  let isCaseStudyModalOpen = $state(false);
  let activeCaseStudy = $state<{ title: string; subtitle: string; details: string; stack: string[] }>({
    title: '',
    subtitle: '',
    details: '',
    stack: [],
  });

  let toastVisible = $state(false);
  let toastMsg = $state('');
  let toastType = $state<'success' | 'warning' | 'error' | 'info'>('success');

  // Interactive Demo States
  let activeSystemTab = $state('workflows');
  let activeMatrixTab = $state('components');
  let sampleProgress = $state(88);
  let switchTelemetry = $state(true);
  let switchEdgeRouting = $state(true);
  let switchZeroTrust = $state(true);

  // Form State
  let contactName = $state('');
  let contactEmail = $state('');
  let contactMessage = $state('');

  function showToast(type: 'success' | 'warning' | 'error' | 'info', msg: string) {
    toastType = type;
    toastMsg = msg;
    toastVisible = true;
  }

  // Sync theme with HTML attribute
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
    triggerHaptic('light');
    isDark = !isDark;
  }

  // 6 Quality Attributes
  const sixPillars = [
    {
      title: 'Scalability',
      sub: 'Mở rộng quy mô ngang',
      desc: 'Thiết kế kiến trúc Sharding, Event-driven với Kafka, đảm bảo hệ thống tự co giãn chịu tải hàng triệu RPS mà không suy giảm hiệu năng.',
      icon: '⚡',
      badge: '1.2M RPS',
      accent: 'emerald' as const,
    },
    {
      title: 'Performance',
      sub: 'Tối ưu độ trễ nano-second',
      desc: 'Giảm thiểu memory allocations trong Go, tối ưu garbage collection, phân bổ bộ đệm trước (pre-allocation) và triệt tiêu I/O bottlenecks.',
      icon: '🚀',
      badge: '< 4ms',
      accent: 'cyan' as const,
    },
    {
      title: 'Reliability',
      sub: 'Tính sẵn sàng cao & Tự phục hồi',
      desc: 'Áp dụng DBOS Durable Execution và thuật toán đồng thuận Raft. Mọi giao dịch được bảo toàn nguyên vẹn kể cả khi mất điện đột ngột.',
      icon: '🛡️',
      badge: '99.995% SLA',
      accent: 'emerald' as const,
    },
    {
      title: 'Security',
      sub: 'Bảo mật Zero Trust',
      desc: 'Mã hóa end-to-end mTLS, kiểm soát truy cập tối thiểu (Least Privilege) và quy trình kiểm toán bảo mật 6 pha phòng thủ chủ động.',
      icon: '🔒',
      badge: 'ZERO TRUST',
      accent: 'violet' as const,
    },
    {
      title: 'Cost-Efficiency',
      sub: 'Tối ưu TCO Cloud',
      desc: 'Giảm 60% chi phí hạ tầng qua kiến trúc Serverless Edge của Cloudflare và tối ưu hóa tài nguyên container Kubernetes.',
      icon: '💎',
      badge: '-60% TCO',
      accent: 'amber' as const,
    },
    {
      title: 'Observability',
      sub: 'Khả năng giám sát sâu',
      desc: 'Tích hợp OpenTelemetry, structured logging với slog, distributed tracing và continuous profiling pprof trên môi trường thực.',
      icon: '📡',
      badge: 'OPENTELEMETRY',
      accent: 'cyan' as const,
    },
  ];

  // Case Studies Data
  const caseStudies = [
    {
      value: 'case-1',
      title: 'Kiến Trúc Luồng Công Việc Bền Vững (Durable Workflows) Đạt 1.2M RPS',
      subtitle: 'Xử lý giao dịch tài chính phân tán không bao giờ mất trạng thái với Go & DBOS',
      badge: 'DISTRIBUTED SYSTEMS',
      content: 'Giải quyết bài toán thắt nút cổ chai khi xử lý hàng triệu giao dịch đồng thời. Bằng việc kết hợp Go coroutine với DBOS và Kafka, hệ thống ghi nhận checkpoint trạng thái trực tiếp vào log bất biến, loại bỏ hoàn toàn hiện tượng thất thoát dữ liệu (data loss) và bảo đảm tính nhất quán cao nhất.',
      details: 'Dự án áp dụng mô hình Saga Pattern phân tán kết hợp máy trạng thái hữu hạn. Khi một node xử lý bị ngắt kết nối giữa chừng, node dự phòng sẽ tiếp quản và khôi phục luồng công việc từ đúng micro-step bị dừng mà không cần chạy lại từ đầu. Đạt throughput đỉnh 1,240,000 transactions/giây với độ trễ p99 dưới 12ms.',
      stack: ['Go (Golang)', 'DBOS Transact', 'Apache Kafka', 'PostgreSQL', 'Docker'],
    },
    {
      value: 'case-2',
      title: 'Kho Ngữ Liệu Vector AI 8.77 Triệu Đoạn Luận Giải v4.0 (56.6 GB)',
      subtitle: 'Truy vấn ngữ nghĩa siêu tốc dưới 4ms cho hệ thống giải đoán Tử Vi Đẩu Số Chính Tông',
      badge: 'COGNITIVE AI',
      content: 'Xây dựng đường ống dữ liệu (data pipeline) nhúng và chỉ mục hóa 8,77 triệu đoạn kiến thức thuật số cổ kim. Sử dụng thuật toán HNSW kết hợp Binary Quantization giúp nén bộ nhớ vector xuống 4 lần trong khi giữ độ chính xác trên 98.4%.',
      details: 'Tích hợp mô hình ngôn ngữ lớn kết hợp Router động: các câu hỏi nhanh được phân luồng sang Gemini 3.8 Flash, các bài luận giải biến hóa cách cục phức tạp được định tuyến tự động sang Gemini 3.8 Pro với Highest Thinking. Thời gian phản hồi trung bình chỉ 3.8ms trên edge node.',
      stack: ['Python', 'HNSW Vector Index', 'Gemini AI API', 'WebAssembly', 'Cloudflare Workers'],
    },
    {
      value: 'case-3',
      title: 'Hệ Thống Thiết Kế KAIROS: Ark UI × Svelte 5 Native State Machines',
      subtitle: 'Triệt tiêu 100% lỗi giao diện di động và đạt độ trễ tương tác 0ms',
      badge: 'DESIGN ENGINEERING',
      content: 'Chuyển dịch toàn bộ hệ thống giao diện sang mô hình Máy Trạng Thái Hữu Hạn (FSM). Xử lý dứt điểm các lỗi kinh điển như iOS auto-zoom, nhảy lề khi mở modal, và xung đột dấu thanh tiếng Việt.',
      details: 'Thiết kế 12 điều luật bất biến (Iron Rules) bao quát từ Tokens, Layout đến Behavior. Sử dụng Tailwind CSS v4 kết hợp Ark UI Svelte Runes giúp bundle size sau nén chỉ vỏn vẹn 45KB gzip, đạt điểm Google Lighthouse 100/100 tuyệt đối.',
      stack: ['Svelte 5 Runes', 'Ark UI', 'Zag.js', 'Tailwind CSS v4', 'TypeScript'],
    },
  ];

  function openCaseStudyModal(study: typeof caseStudies[0]) {
    activeCaseStudy = study;
    isCaseStudyModalOpen = true;
  }

  function handleContactSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!contactName || !contactEmail) {
      showToast('error', 'Vui lòng điền đầy đủ Tên và Email liên hệ!');
      return;
    }
    isContactModalOpen = false;
    showToast('success', `Cảm ơn ${contactName}! Yêu cầu kết nối kiến trúc đã được tiếp nhận.`);
    contactName = '';
    contactEmail = '';
    contactMessage = '';
  }
</script>

<div class="min-h-screen font-sans bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950 transition-colors duration-150">
  
  <!-- Ambient Grid Background -->
  <div class="fixed inset-0 bg-grid-ambient pointer-events-none z-0"></div>

  <!-- Global Header -->
  <header class="sticky top-0 z-[100] backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      
      <!-- Brand Logo -->
      <a href="/" class="flex items-center gap-2.5 group select-none">
        <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm group-hover:scale-105 transition-transform">
          Z
        </div>
        <div class="leading-none">
          <div class="font-sans font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            ZERA
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
          </div>
          <span class="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Solutions Architect</span>
        </div>
      </a>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-6 text-xs font-mono">
        <a href="#pillars" class="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">KIẾN TRÚC</a>
        <a href="#systems" class="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">HỆ THỐNG</a>
        <a href="#cases" class="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">CASE STUDIES</a>
        <a href="#rules" class="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">DESIGN RULES</a>
        <a href="#matrix" class="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">LAB MATRIX</a>
      </nav>

      <!-- Desktop Actions -->
      <div class="hidden sm:flex items-center gap-2.5">
        <Button variant="outline" size="sm" onclick={toggleTheme}>
          {isDark ? '☀️ LIGHT' : '🌙 DARK'}
        </Button>
        <Button variant="primary" size="sm" onclick={() => isContactModalOpen = true}>
          KẾT NỐI &rarr;
        </Button>
      </div>

      <!-- Mobile Actions (Compact Thumb Zone) -->
      <div class="flex sm:hidden items-center gap-2">
        <button
          type="button"
          onclick={toggleTheme}
          aria-label="Đổi giao diện Sáng/Tối"
          class="w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-sm active:scale-90 transition-transform cursor-pointer"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button
          type="button"
          onclick={() => { triggerHaptic('light'); isMobileDrawerOpen = true; }}
          aria-label="Mở Menu Điều Hướng"
          class="px-3 h-10 rounded-xl flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-xs font-semibold active:scale-95 transition-transform cursor-pointer"
        >
          <span class="text-base leading-none">☰</span>
          <span>MENU</span>
        </button>
      </div>

    </div>
  </header>

  <!-- Main Container: Pure Mobile Web unconstrained reading flow (No fake bottom dock clutter) -->
  <main class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-16 sm:space-y-20 pb-16 sm:pb-20">

    <!-- ================================================================= -->
    <!-- 01. HERO BENTO SECTION -->
    <!-- ================================================================= -->
    <section class="space-y-6 sm:space-y-8">
      
      <!-- Top Pill -->
      <div class="flex items-center gap-2">
        <Badge variant="emerald" pulse>
          LIVE TELEMETRY // DISTRIBUTED SYSTEMS & AI
        </Badge>
        <span class="text-xs font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
          ISO-KAIROS-ARK-2026.05
        </span>
      </div>

      <!-- Main Headline -->
      <div class="max-w-4xl space-y-4">
        <h1 class="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl text-zinc-900 dark:text-zinc-100 tracking-tight leading-[1.2]">
          KIẾN TRÚC HỆ THỐNG PHÂN TÁN. <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
            TRÍ TUỆ NHÂN TẠO GỐC RỄ.
          </span>
        </h1>
        <p class="font-sans text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
          Xin chào, tôi là <strong>Zera</strong> — Principal Solutions Architect & AI Engineering Lead. Chuyên sâu thiết kế luồng xử lý dữ liệu chịu tải hàng triệu RPS, hệ thống bền vững với <strong>Go & DBOS</strong>, và kho ngữ liệu Vector <strong>8.77M nodes</strong>.
        </p>
      </div>

      <!-- Hero Bento Metrics: 100% Fully Visible 2-Column Mobile Grid (Rule 08: Zero Horizontal Scroll) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-2">
        <Card class="p-3.5 sm:p-4" glow="emerald">
          <div class="font-mono text-xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">1.2M+</div>
          <div class="font-mono text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-1 uppercase font-semibold">Transactions / Giây</div>
          <p class="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Throughput luồng Go & Kafka</p>
        </Card>

        <Card class="p-3.5 sm:p-4" glow="cyan">
          <div class="font-mono text-xl sm:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">8.77M</div>
          <div class="font-mono text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-1 uppercase font-semibold">Tianji Vector Corpus</div>
          <p class="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">56.6 GB luận giải thuật số</p>
        </Card>

        <Card class="p-3.5 sm:p-4">
          <div class="font-mono text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">99.995%</div>
          <div class="font-mono text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-1 uppercase font-semibold">Tính Sẵn Sàng (SLA)</div>
          <p class="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Raft & DBOS durable state</p>
        </Card>

        <Card class="p-3.5 sm:p-4">
          <div class="font-mono text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">0ms</div>
          <div class="font-mono text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-1 uppercase font-semibold">Độ Trễ Tương Tác</div>
          <p class="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Ark UI State Machine (FSM)</p>
        </Card>
      </div>

      <!-- Action Buttons (Full width on mobile for thumb reach) -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <Button variant="primary" class="w-full sm:w-auto justify-center min-h-[44px]" onclick={() => {
          document.getElementById('systems')?.scrollIntoView({ behavior: 'smooth' });
        }}>
          KHÁM PHÁ KIẾN TRÚC &rarr;
        </Button>
        <Button variant="secondary" class="w-full sm:w-auto justify-center min-h-[44px]" onclick={() => isContactModalOpen = true}>
          ĐẶT LỊCH TƯ VẤN KIẾN TRÚC
        </Button>
        <Tooltip content="Hệ thống thiết kế chuẩn hóa máy trạng thái hữu hạn cho Svelte 5">
          <Button variant="outline" class="w-full sm:w-auto justify-center min-h-[44px]" onclick={() => {
            document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            12 QUY TẮC KAIROS ℹ
          </Button>
        </Tooltip>
      </div>

    </section>

    <!-- ================================================================= -->
    <!-- 02. SIX PILLARS OF SYSTEMS ARCHITECTURE -->
    <!-- ================================================================= -->
    <section id="pillars" class="space-y-6 pt-6">
      
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <div>
          <span class="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">
            ■ ARCHITECTURAL QUALITY ATTRIBUTES
          </span>
          <h2 class="font-display font-bold text-2xl sm:text-3xl text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
            6 TRỤ CỘT THIẾT KẾ HỆ THỐNG BẢO CHỨNG
          </h2>
        </div>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm">
          Tiêu chuẩn giải pháp doanh nghiệp được kiểm chứng qua các hệ thống phân tán quy mô lớn.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each sixPillars as pillar}
          <Card class="p-5" badge={pillar.badge} badgeVariant={pillar.accent}>
            <div class="flex items-center gap-3 mb-2">
              <span class="text-2xl">{pillar.icon}</span>
              <div>
                <h3 class="font-sans font-semibold text-base text-zinc-900 dark:text-zinc-100">{pillar.title}</h3>
                <span class="font-mono text-xs text-zinc-500 dark:text-zinc-400">{pillar.sub}</span>
              </div>
            </div>
            <p class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mt-2">
              {pillar.desc}
            </p>
          </Card>
        {/each}
      </div>

    </section>

    <!-- ================================================================= -->
    <!-- 03. INTERACTIVE SYSTEMS MATRIX (ARK UI TABS) -->
    <!-- ================================================================= -->
    <section id="systems" class="space-y-6 pt-6">
      
      <div class="border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <span class="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-semibold tracking-wider uppercase">
          ■ INTERACTIVE RUNTIME SHOWCASE
        </span>
        <h2 class="font-display font-bold text-2xl sm:text-3xl text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
          HỆ THỐNG TRỰC TIẾP & BÀN ĐIỀU KHIỂN TELEMETRY
        </h2>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
          Được điều khiển trọn vẹn bởi <strong>Ark UI Tabs (Zag.js State Machine)</strong> với phím tắt điều hướng mũi tên tức thời.
        </p>
      </div>

      <!-- Ark UI Tabs Showcase -->
      <Tabs
        items={[
          { id: 'workflows', label: '01 / DISTRIBUTED WORKFLOWS', shortLabel: '01 / WORKFLOWS', icon: '⚡' },
          { id: 'tianji', label: '02 / TIANJI VECTOR AI', shortLabel: '02 / TIANJI AI', icon: '🧠' },
          { id: 'console', label: '03 / CLI TELEMETRY CONSOLE', shortLabel: '03 / CONSOLE', icon: '💻' },
        ]}
        bind:value={activeSystemTab}
      >
        {#if activeSystemTab === 'workflows'}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card class="lg:col-span-2 p-6" title="KIẾN TRÚC LUỒNG CÔNG VIỆC BỀN VỮNG (GO + DBOS)" badge="FAULT-TOLERANT" badgeVariant="emerald">
                <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
                  Kết hợp năng lực xử lý đồng thời siêu việt của <strong>Go (Goroutine & Channels)</strong> với nguyên lý <strong>Durable Execution</strong> của DBOS. Mọi hàm thực thi được chia tách thành các bước nguyên tử (atomic steps) lưu trữ trong Transactional Log bất biến.
                </p>

                <!-- Flow Diagram Matrix -->
                <div class="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 font-mono text-xs space-y-3">
                  <div class="flex items-center justify-between text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <span>TRANSACTION PIPELINE PIPESTREAM</span>
                    <span class="text-emerald-600 dark:text-emerald-400 font-semibold">● 100% IDEMPOTENT</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px]">
                    <div class="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm">
                      1. Ingest Event<br><span class="text-zinc-500 dark:text-zinc-400">Kafka 1.2M RPS</span>
                    </div>
                    <div class="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm">
                      2. Step Checkpoint<br><span class="text-emerald-600 dark:text-emerald-400 font-medium">DBOS Log</span>
                    </div>
                    <div class="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm">
                      3. Business Logic<br><span class="text-cyan-600 dark:text-cyan-400 font-medium">Go Runtime</span>
                    </div>
                    <div class="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm">
                      4. Commit Ack<br><span class="text-emerald-600 dark:text-emerald-400 font-medium">Zero-Loss</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-3 pt-4">
                  <Button variant="primary" size="sm" onclick={() => showToast('success', 'Đã giả lập kích hoạt 10,000 sự kiện phân tán thành công!')}>
                    SIMULATE INGESTION EVENT &rarr;
                  </Button>
                  <Button variant="ghost" size="sm" onclick={() => openCaseStudyModal(caseStudies[0])}>
                    XEM CHI TIẾT SƠ ĐỒ ĐỒNG THUẬN
                  </Button>
                </div>
              </Card>

              <!-- Telemetry Controls -->
              <Card class="p-6" title="THÔNG SỐ VẬN HÀNH" badge="LIVE METRICS">
                <div class="space-y-4">
                  <div>
                    <div class="flex justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                      <span>CLUSTER CAPACITY</span>
                      <span class="text-emerald-600 dark:text-emerald-400 font-bold">{sampleProgress}%</span>
                    </div>
                    <Progress value={sampleProgress} variant="emerald" />
                  </div>

                  <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                    <Switch bind:checked={switchTelemetry} label="OpenTelemetry Trace Exporter" />
                    <Switch bind:checked={switchEdgeRouting} label="Cloudflare Edge Zero-Latency" />
                    <Switch bind:checked={switchZeroTrust} label="Zero-Trust Strict Mutual TLS" />
                  </div>

                  <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                    <div>GC Pause: <strong class="text-zinc-800 dark:text-zinc-200">0.18ms</strong></div>
                    <div>Alloc Rate: <strong class="text-zinc-800 dark:text-zinc-200">14.2 MB/s</strong></div>
                    <div>Active Coroutines: <strong class="text-emerald-600 dark:text-emerald-400 font-semibold">42,500</strong></div>
                  </div>
                </div>
              </Card>
            </div>

          {:else if activeSystemTab === 'tianji'}
            <Card class="p-6" title="KHO NGỮ LIỆU VECTOR AI 8.77M ĐOẠN LUẬN GIẢI V4.0 (56.6 GB)" badge="TIANJI AI" badgeVariant="cyan">
              <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4 max-w-3xl">
                Dự án đại diện cho sự kết tinh giữa <strong>Thuật Số Cổ Điển Chính Tông</strong> (Tử Vi Đẩu Số Trần Hi Di, Tinh hoa Thiên Kỷ Nghê Hải Hà) và <strong>Công Nghệ Trí Tuệ Nhân Tạo Hiện Đại</strong>. Toàn bộ 674.976 lá số qua 76 năm được số hóa thành vector embedding đa chiều.
              </p>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs mb-4">
                <div class="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div class="text-zinc-500 dark:text-zinc-400 text-[10px]">VECTOR INDEX TYPE</div>
                  <div class="text-zinc-900 dark:text-zinc-100 font-bold text-sm mt-0.5">HNSW + BQ Quantization</div>
                </div>
                <div class="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div class="text-zinc-500 dark:text-zinc-400 text-[10px]">QUERY SEARCH LATENCY</div>
                  <div class="text-cyan-600 dark:text-cyan-400 font-bold text-sm mt-0.5">&lt; 3.8ms / Request</div>
                </div>
                <div class="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div class="text-zinc-500 dark:text-zinc-400 text-[10px]">REASONING ENGINE</div>
                  <div class="text-violet-600 dark:text-violet-400 font-bold text-sm mt-0.5">Gemini 3.8 Flash-High</div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <Button variant="primary" size="sm" onclick={() => showToast('info', 'Truy vấn vector mẫu node Mệnh Cung Thất Sát triều đẩu: Hoàn tất trong 2.4ms!')}>
                  THỬ TRUY VẤN VECTOR NGỮ NGHĨA &rarr;
                </Button>
                <Button variant="ghost" size="sm" onclick={() => openCaseStudyModal(caseStudies[1])}>
                  ĐỌC BÁO CÁO THUẬT TOÁN HNSW
                </Button>
              </div>
            </Card>

          {:else if activeSystemTab === 'console'}
            <div class="space-y-4">
              <Terminal />
            </div>
          {/if}
      </Tabs>

    </section>

    <!-- ================================================================= -->
    <!-- 04. ARCHITECTURAL CASE STUDIES (ARK UI ACCORDION & DIALOG) -->
    <!-- ================================================================= -->
    <section id="cases" class="space-y-6 pt-6">
      
      <div class="border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <span class="font-mono text-xs text-violet-600 dark:text-violet-400 font-semibold tracking-wider uppercase">
          ■ IN-DEPTH ARCHITECTURAL INVESTIGATION
        </span>
        <h2 class="font-display font-bold text-2xl sm:text-3xl text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
          NGHIÊN CỨU ĐIỂN HÌNH (CASE STUDIES)
        </h2>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
          Phân rã vấn đề từ nguyên lý cơ bản (First Principles), áp dụng <strong>Ark UI Accordion</strong> mở rộng mượt mà.
        </p>
      </div>

      <Accordion
        items={caseStudies.map((c) => ({
          value: c.value,
          title: c.title,
          subtitle: c.subtitle,
          badge: c.badge,
          content: c.content,
        }))}
      />

    </section>

    <!-- ================================================================= -->
    <!-- 05. KAIROS DESIGN SYSTEM (12 IRON RULES CATALOG) -->
    <!-- ================================================================= -->
    <section id="rules" class="space-y-6 pt-6">
      
      <div class="border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <span class="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">
          ■ DESIGN SYSTEM SPECIFICATION (ARK UI × SVELTE 5)
        </span>
        <h2 class="font-display font-bold text-2xl sm:text-3xl text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
          BỘ 12 ĐIỀU LUẬT BẤT BIẾN KAIROS DESIGN SYSTEM
        </h2>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
          Mã hiệu tiêu chuẩn: <strong>ISO-KAIROS-ARK-2026.05</strong>. Quản lý hành vi cơ học bằng cỗ máy trạng thái Zag.js.
        </p>
      </div>

      <!-- 12 Rules Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each KAIROS_DESIGN_RULES as rule}
          <div class="card-kairos p-5 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 dark:border-emerald-500/30">
                  RULE #{rule.ruleNumber}
                </span>
                <span class="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 uppercase">{rule.name}</span>
              </div>
              <h3 class="font-sans font-semibold text-base text-zinc-900 dark:text-zinc-100 leading-snug">
                {rule.title}
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
                {rule.description}
              </p>
            </div>

            <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 font-mono text-[11px] space-y-1">
              <div class="text-rose-600 dark:text-rose-400/90 leading-relaxed">
                ✖ CẤM: {rule.badPractice}
              </div>
              <div class="text-emerald-700 dark:text-emerald-400/90 leading-relaxed">
                ✔ CHUẨN: {rule.goodPractice}
              </div>
            </div>
          </div>
        {/each}
      </div>

    </section>

    <!-- ================================================================= -->
    <!-- 06. COMPONENT MATRIX & LIVE LAB -->
    <!-- ================================================================= -->
    <section id="matrix" class="space-y-6 pt-6">
      
      <div class="border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <span class="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold tracking-wider uppercase">
          ■ ZERO-DEFECT COMPONENT SUITE
        </span>
        <h2 class="font-display font-bold text-2xl sm:text-3xl text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
          PHÒNG THỬ NGHIỆM LINH KIỆN ARK UI
        </h2>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
          Kiểm nghiệm trực tiếp khả năng phản hồi haptics, WAI-ARIA, và tương thích Dark/Light Mode.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Buttons & Feedback -->
        <Card title="NÚT BẤM (BUTTONS) & THÔNG BÁO (TOAST)" badge="TACTILE">
          <div class="space-y-4">
            <div>
              <div class="text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-2">CÁC BIẾN THỂ NÚT BẤM CƠ HỌC:</div>
              <div class="flex flex-wrap gap-2">
                <Button variant="primary" onclick={() => showToast('success', 'Bấm nút Primary (Emerald Brand) thành công!')}>
                  PRIMARY
                </Button>
                <Button variant="secondary" onclick={() => showToast('info', 'Thông báo info từ Secondary Button.')}>
                  SECONDARY
                </Button>
                <Button variant="outline" onclick={() => showToast('warning', 'Cảnh báo bộ nhớ tạm đạt 85%!')}>
                  OUTLINE
                </Button>
                <Button variant="contrast" onclick={() => showToast('info', 'Bấm nút Contrast Monochrome (Vercel Inversion)!')}>
                  CONTRAST
                </Button>
                <Button variant="danger" onclick={() => showToast('error', 'Lỗi kết nối node mạng phân tán!')}>
                  DANGER
                </Button>
              </div>
            </div>

            <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <div class="text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-2">TRẠNG THÁI LOADING & DISABLED:</div>
              <div class="flex flex-wrap gap-2">
                <Button variant="primary" loading>ĐANG XỬ LÝ...</Button>
                <Button variant="secondary" disabled>VÔ HIỆU HÓA</Button>
              </div>
            </div>
          </div>
        </Card>

        <!-- Form Controls & Anti-Zoom -->
        <Card title="FORM NHẬP LIỆU & CHỐNG PHÓNG TO MOBILE" badge="WAI-ARIA">
          <div class="space-y-4">
            <Input
              label="TÊN PHÂN HỆ HỆ THỐNG"
              placeholder="Nhập tên module..."
              value="Distributed State Engine"
              prefix="MOD >"
            />
            <Input
              label="EMAIL KIẾN TRÚC SƯ"
              placeholder="architect@engbbq.me"
              type="email"
              prefix="SYS >"
            />
            <div class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 leading-relaxed">
              ✔ <strong>Rule 04 Đã Áp Dụng</strong>: Mọi ô input trên điện thoại đều có cỡ chữ 16px, ngăn chặn 100% hiện tượng tự động zoom của iOS Safari.
            </div>
          </div>
        </Card>

      </div>

    </section>

    <!-- ================================================================= -->
    <!-- 07. CONTACT & ARCHITECTURAL CONSULTATION -->
    <!-- ================================================================= -->
    <section class="p-8 sm:p-12 rounded-2xl bg-zinc-100 dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center space-y-4 shadow-sm">
      <Badge variant="emerald" pulse>AVAILABLE FOR HIGH-IMPACT ARCHITECTURAL ADVISORY</Badge>
      <h2 class="font-display font-extrabold text-2xl sm:text-4xl text-zinc-900 dark:text-zinc-100 tracking-tight">
        SẴN SÀNG GIẢI QUYẾT BÀI TOÁN KIẾN TRÚC KHÓ NHẤT CỦA BẠN
      </h2>
      <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
        Từ tái cấu trúc hệ thống chịu tải cao, thiết kế luồng công việc bền vững (Durable Workflows), cho đến tích hợp đường ống Vector AI chuyên sâu.
      </p>
      <div class="pt-2">
        <Button variant="primary" size="lg" onclick={() => isContactModalOpen = true}>
          BẮT ĐẦU KẾT NỐI NGAY &rarr;
        </Button>
      </div>
    </section>

  </main>

  <!-- Global Footer -->
  <footer class="border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 py-10 text-xs font-mono text-zinc-600 dark:text-zinc-400 transition-colors">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="text-zinc-900 dark:text-zinc-100 font-bold">ZERA</span>
        <span>&bull;</span>
        <span>PRINCIPAL SOLUTIONS ARCHITECT</span>
        <span>&bull;</span>
        <span class="text-emerald-600 dark:text-emerald-400">ENGBBQ.ME</span>
      </div>

      <div class="text-center sm:text-right text-[11px] text-zinc-500 dark:text-zinc-400">
        POWERED BY <strong>SVELTE 5 RUNES</strong> &bull; <strong>ARK UI STATE MACHINES</strong> &bull; <strong>TAILWIND CSS V4</strong>
      </div>
    </div>
  </footer>

  <!-- ================================================================= -->
  <!-- DIALOG 1: CONTACT MODAL (ARK UI DIALOG) -->
  <!-- ================================================================= -->
  <Dialog
    bind:open={isContactModalOpen}
    title="KẾT NỐI KIẾN TRÚC SƯ TRƯỞNG (SOLUTIONS ARCHITECT)"
    description="Trao đổi về kiến trúc hệ thống phân tán, tối ưu hóa TCO hoặc tích hợp AI chuyên sâu."
  >
    <form onsubmit={handleContactSubmit} class="space-y-4 mt-2">
      <Input
        label="HỌ VÀ TÊN"
        placeholder="Nguyễn Văn A"
        bind:value={contactName}
      />
      <Input
        label="EMAIL DOANH NGHIỆP"
        placeholder="a.nguyen@company.com"
        type="email"
        bind:value={contactEmail}
      />
      <div>
        <label for="contact-msg-area" class="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
          MÔ TẢ BÀI TOÁN HỆ THỐNG / YÊU CẦU
        </label>
        <textarea
          id="contact-msg-area"
          bind:value={contactMessage}
          rows="3"
          placeholder="Mô tả quy mô RPS, vấn đề độ trễ hoặc công nghệ bạn muốn tư vấn..."
          class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-500 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-500 dark:focus:ring-zinc-600"
        ></textarea>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onclick={() => isContactModalOpen = false}>
          HỦY BỎ
        </Button>
        <Button variant="primary" type="submit">
          GỬI THÔNG TIN LIÊN HỆ &rarr;
        </Button>
      </div>
    </form>
  </Dialog>

  <!-- ================================================================= -->
  <!-- DIALOG 2: CASE STUDY DETAILS MODAL (ARK UI DIALOG) -->
  <!-- ================================================================= -->
  <Dialog
    bind:open={isCaseStudyModalOpen}
    title={activeCaseStudy.title}
    description={activeCaseStudy.subtitle}
  >
    <div class="space-y-4 mt-2">
      <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
        {activeCaseStudy.details}
      </div>

      <div>
        <div class="text-xs font-mono text-zinc-600 dark:text-zinc-400 uppercase mb-2">KHUNG CÔNG NGHỆ ÁP DỤNG:</div>
        <div class="flex flex-wrap gap-1.5">
          {#each activeCaseStudy.stack as tech}
            <span class="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 font-mono text-xs border border-zinc-200 dark:border-zinc-700/60">
              {tech}
            </span>
          {/each}
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <Button variant="secondary" onclick={() => isCaseStudyModalOpen = false}>
          ĐÓNG HỘP THOẠI
        </Button>
      </div>
    </div>
  </Dialog>

  <!-- ================================================================= -->
  <!-- TOAST: DYNAMIC ISLAND TOP BANNER -->
  <!-- ================================================================= -->
  <Toast
    bind:visible={toastVisible}
    title={toastType === 'success' ? 'TRANSACTION COMPLETED' : toastType === 'error' ? 'SYSTEM ERROR' : 'TELEMETRY EVENT'}
    message={toastMsg}
    type={toastType}
  />

  <!-- ================================================================= -->
  <!-- MOBILE SLIDE-OVER DRAWER (PURE MOBILE WEB ARCHITECTURE) -->
  <!-- ================================================================= -->
  <!-- Pure Mobile Web Navigation: Clean, unconstrained reading flow via top header + slide-over drawer -->
  <MobileDrawer
    bind:open={isMobileDrawerOpen}
    {isDark}
    onToggleTheme={toggleTheme}
    onOpenContact={() => isContactModalOpen = true}
  />

</div>

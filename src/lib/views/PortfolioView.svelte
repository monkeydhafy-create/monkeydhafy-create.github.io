<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Loader from '$lib/components/Loader.svelte';
  import Accordion from '$lib/components/Accordion.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import DialogDrawer from '$lib/components/DialogDrawer.svelte';
  import { triggerHaptic } from '$lib/constants/tokens';

  interface Props {
    isDark?: boolean;
    ontoggleTheme?: () => void;
    onnavigate?: (route: 'portfolio' | 'components') => void;
  }

  let { isDark = false, ontoggleTheme, onnavigate }: Props = $props();

  // Dialog & Toast states for portfolio interactive touchpoints
  let isContactModalOpen = $state(false);
  let isToastVisible = $state(false);
  let toastMsg = $state('');
  let toastType = $state<'success' | 'warning' | 'error' | 'info'>('success');

  // Interactive Terminal
  interface HistoryItem {
    type: 'input' | 'output' | 'error';
    text: string;
  }
  let terminalInput = $state('');
  let terminalHistory = $state<HistoryItem[]>([
    { type: 'output', text: 'Zera Portfolio Telemetry & Command Center [v2.4.0]' },
    { type: 'output', text: 'Type "help" to view commands: bio, stack, projects, philosophy, contact, components, clear.' }
  ]);

  function executeTerminal(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    terminalHistory.push({ type: 'input', text: `➜ ~ ${trimmed}` });
    const lower = trimmed.toLowerCase();

    switch (lower) {
      case 'help':
        terminalHistory.push({
          type: 'output',
          text: 'AVAILABLE COMMANDS:\n  • bio        - Who is Zera / MonkeyDhafy\n  • stack      - Core engineering technologies\n  • projects   - Flagship production platforms (EngBbq, Tianji)\n  • philosophy - 6 Quality Pillars & First Principles\n  • contact    - Direct communication channels\n  • components - Jump to Design System Showroom\n  • clear      - Clear terminal screen'
        });
        break;
      case 'bio':
        terminalHistory.push({
          type: 'output',
          text: 'IDENTITY: Zera (MonkeyDhafy)\nROLE: Principal Solutions Architect & AI Engineering Lead\nMISSION: Building zero-compromise distributed platforms, durable workflows, and cognitive AI systems.'
        });
        break;
      case 'stack':
        terminalHistory.push({
          type: 'output',
          text: 'TECH STACK:\n  • Backend: Go (Goroutines, High-Throughput), DBOS Durable Workflows, Python, Rust\n  • AI & Hermeneutics: Gemini 3.8 Flash High, PyTorch, 8.77M Sharded Vector Corpus\n  • Frontend: Svelte 5 (Runes), Ark UI (Zag.js FSM), Tailwind CSS v4, Flutter (Dart)\n  • Infra & Security: Bare-metal automation, Linux Kernel, Cloudflare Zero Trust'
        });
        break;
      case 'projects':
        terminalHistory.push({
          type: 'output',
          text: 'PROJECTS:\n  1. EngBbq (https://engbbq.me) - Cognitive Language Acquisition Platform\n  2. Tianji Ziwei AI - 8.77M Vector Knowledge Corpus (56.6 GB)\n  3. Autonomous Agent Framework - High-Speed Bare-Metal Automation Protocols'
        });
        break;
      case 'philosophy':
        terminalHistory.push({
          type: 'output',
          text: '6 QUALITY PILLARS:\n  [1] Scalability  [2] Low-Latency Performance  [3] High Availability (Self-Healing)\n  [4] Zero Trust   [5] Cost-Efficiency          [6] Deep Observability'
        });
        break;
      case 'contact':
        terminalHistory.push({
          type: 'output',
          text: 'CONTACT:\n  • GitHub: https://github.com/monkeydhafy-create\n  • Platform: https://engbbq.me\n  • Status: Open for High-Impact Architecture Consulting'
        });
        break;
      case 'components':
        onnavigate?.('components');
        terminalHistory.push({ type: 'output', text: 'Navigating to Component Showroom...' });
        break;
      case 'clear':
        terminalHistory = [];
        break;
      default:
        terminalHistory.push({
          type: 'error',
          text: `Command not recognized: "${trimmed}". Type "help" for a list of available commands.`
        });
        break;
    }
    terminalInput = '';
  }

  function copyContact(info: string, label: string) {
    triggerHaptic('mediumClick');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(info);
    }
    toastType = 'success';
    toastMsg = `Đã sao chép ${label} vào bộ nhớ tạm!`;
    isToastVisible = true;
  }

  const pillarsAccordion = [
    {
      id: 'pil-1',
      title: '01 / FIRST PRINCIPLES & SCALABILITY',
      badge: 'SCALE',
      content: 'Phân rã mọi bài toán kỹ thuật xuống nguyên lý vật lý, toán học và logic gốc rễ. Thiết kế hệ thống chịu tải cao (High-Throughput Concurrency) bằng Go và cơ chế workflow bền vững (Durable Execution) của DBOS, sẵn sàng mở rộng ngang khi lưu lượng chạm hàng triệu RPS.'
    },
    {
      id: 'pil-2',
      title: '02 / LOW-LATENCY PERFORMANCE (P99 < 15MS)',
      badge: 'PERF',
      content: 'Tối ưu độ trễ ở mức tối thượng. Loại bỏ mọi lớp abstraction dư thừa, kiểm soát cấp phát bộ nhớ (Zero Allocation Hot Paths), tối ưu hóa luồng I/O mạng và thời gian phản hồi xúc giác cơ học dưới 100ms trên client.'
    },
    {
      id: 'pil-3',
      title: '03 / HIGH AVAILABILITY & SELF-HEALING',
      badge: 'RELIABILITY',
      content: 'Kiến trúc chịu lỗi tuyệt đối (Fault-Tolerant by Design). Khi bất kỳ node hay worker nào gặp sự cố ngắt nguồn, toàn bộ trạng thái giao dịch (Durable State) được phục hồi ngay tại bước cuối cùng mà không làm mất mát dữ liệu của người dùng.'
    },
    {
      id: 'pil-4',
      title: '04 / ZERO TRUST DEFENSIVE CYBERSECURITY',
      badge: 'SECURITY',
      content: 'Áp dụng quy trình phòng vệ đa lớp Cloudflare 6-Phase Pipeline: Reconnaissance, Coverage Hunting, Validation, Adversarial Disproving, Structured Findings và Neutral Reporting. Tuyệt đối không lưu trữ credential lộ thiên.'
    },
    {
      id: 'pil-5',
      title: '05 / TCO & BARE-METAL COST-EFFICIENCY',
      badge: 'COST',
      content: 'Khai thác tối đa sức mạnh phần cứng máy chủ thực (Bare-Metal Architecture). Giảm thiểu lãng phí tài nguyên cloud đắt đỏ bằng cách tối ưu thuật toán, shard hóa cơ sở dữ liệu và tự động hóa quy trình CI/CD.'
    },
    {
      id: 'pil-6',
      title: '06 / DEEP OBSERVABILITY & STRUCTURED TELEMETRY',
      badge: 'OBSERVE',
      content: 'Hệ thống vận hành không thể là hộp đen. Mọi transaction đều được trace rõ ràng qua structured logging (slog), metrics tức thời và bảng điều khiển trực quan telemetry.'
    }
  ];
</script>

<div class="min-h-screen bg-brutal-dots transition-colors duration-150 p-2 sm:p-4 md:p-8 lg:p-12 text-black dark:text-white overflow-x-hidden">
  <!-- Masthead Container (Desktop 1240px Matrix / Mobile Fit-On-Screen) -->
  <div class="max-w-[1240px] w-full mx-auto bg-white dark:bg-[#0E0E10] border-[3px] md:border-[4px] border-black dark:border-white shadow-[8px_8px_0px_#000] md:shadow-[16px_16px_0px_#000] dark:shadow-[8px_8px_0px_#FFFFFF] md:dark:shadow-[16px_16px_0px_#FFFFFF] overflow-hidden">
    
    <!-- Top Global Header & Navigation -->
    <header class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b-[3px] md:border-b-[4px] border-black dark:border-white bg-white dark:bg-[#09090B] transition-colors duration-150">
      
      <!-- Brand & Title -->
      <div class="flex items-center">
        <div class="w-14 sm:w-16 h-14 sm:h-16 bg-[#FF007A] text-white dark:bg-[#200412] dark:text-[#FF1A8C] flex items-center justify-center font-mono font-black text-xl sm:text-2xl border-r-[3px] md:border-r-[4px] border-black dark:border-white shrink-0">
          Z
        </div>
        <div class="px-4 py-2">
          <div class="flex items-center gap-2">
            <span class="font-sans font-black text-xl sm:text-2xl tracking-tight uppercase text-black dark:text-white leading-normal">
              ZERA
            </span>
            <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] border border-black dark:border-white leading-snug">
              MONKEYDHAFY
            </span>
          </div>
          <p class="font-mono text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5 leading-snug">
            PRINCIPAL SOLUTIONS ARCHITECT &bull; AI ENGINEERING LEAD
          </p>
        </div>
      </div>

      <!-- Action Navigation Hub -->
      <div class="flex items-center justify-between sm:justify-end border-t-[3px] sm:border-t-0 border-black dark:border-white p-2.5 sm:p-3 gap-2 bg-neutral-100 dark:bg-[#18181B]">
        <!-- Page Switcher: Portfolio vs Components Demo -->
        <div class="inline-flex border-2 border-black dark:border-white bg-white dark:bg-[#0E0E10] p-1 gap-1">
          <button
            type="button"
            class="px-3 py-1 font-mono text-xs font-black uppercase bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] border border-black dark:border-white shadow-[1.5px_1.5px_0px_#000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF] cursor-pointer"
          >
            👤 HỒ SƠ
          </button>
          <button
            type="button"
            onclick={() => { triggerHaptic('mediumClick'); onnavigate?.('components'); }}
            class="px-3 py-1 font-mono text-xs font-bold uppercase text-neutral-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            🧩 COMPONENT LAB &rarr;
          </button>
        </div>

        <!-- Dark/Light Mode Toggle -->
        <button
          onclick={() => { triggerHaptic('lightTap'); ontoggleTheme?.(); }}
          class="btn-tactile px-3 py-1.5 font-mono text-xs font-black uppercase bg-[#FFE600] text-black dark:bg-[#18181B] dark:text-[#FFE600] border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer shrink-0"
        >
          {isDark ? '☀️ LIGHT' : '🌙 DARK'}
        </button>
      </div>
    </header>

    <!-- Main Hero Presentation -->
    <section class="p-4 sm:p-8 md:p-12 border-b-[3px] md:border-b-[4px] border-black dark:border-white bg-white dark:bg-[#0E0E10]">
      <div class="max-w-4xl">
        <div class="flex flex-wrap gap-2 mb-4">
          <Badge variant="yellow" rotate="left">FIRST PRINCIPLES ARCHITECTURE</Badge>
          <Badge variant="cyan">DISTRIBUTED WORKFLOWS (GO + DBOS)</Badge>
          <Badge variant="magenta">8.77M VECTOR CORPUS</Badge>
          <Badge variant="lime">WCAG AAA COMPLIANT</Badge>
        </div>

        <h1 class="font-sans font-black text-2xl xs:text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-black dark:text-white uppercase leading-[1.3] sm:leading-[1.18] tracking-normal mb-6 break-words max-w-full">
          KIẾN TRÚC HỆ THỐNG.<br>
          TRÍ TUỆ NHÂN TẠO.<br>
          <span class="bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] px-2.5 py-1 border-[2.5px] md:border-[3px] border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] md:shadow-[4px_4px_0px_#000] md:dark:shadow-[4px_4px_0px_#FFFFFF] inline-block mt-2 max-w-full break-words leading-snug">
            THỰC CHIẾN GỐC RỄ.
          </span>
        </h1>

        <p class="font-sans text-base sm:text-lg md:text-xl text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-3xl mb-8">
          Chào bạn, mình là <strong>Zera (MonkeyDhafy)</strong> — Kỹ sư Giải pháp Trưởng & Trưởng nhóm Kỹ thuật AI. 
          Mình chuyên sâu vào việc thiết kế và hiện thực hóa các <strong>nền tảng phân tán chịu lỗi cao</strong>, 
          quy trình làm việc bền vững (Durable Execution Workflows) với <strong>Go</strong>, xử lý kho tri thức ngôn ngữ nhận thức & thuật số quy mô lớn (<strong>8,77 triệu bản ghi</strong>), 
          cùng với giao diện người dùng cơ học tốc độ cao trên <strong>Svelte 5 Runes & Ark UI</strong>.
        </p>

        <!-- CTA Buttons Row -->
        <div class="flex flex-wrap items-center gap-3 sm:gap-4">
          <Button
            variant="primary"
            size="lg"
            onclick={() => { triggerHaptic('heavyClick'); onnavigate?.('components'); }}
          >
            🧩 XEM PHÒNG DEMO TẤT CẢ COMPONENT &rarr;
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onclick={() => { triggerHaptic('lightTap'); isContactModalOpen = true; }}
          >
            📬 KẾT NỐI & LIÊN HỆ TRỰC TIẾP
          </Button>

          <Button
            variant="outline"
            size="lg"
            onclick={() => {
              const termEl = document.getElementById('terminal-section');
              termEl?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            💻 MỞ RADAR TERMINAL
          </Button>
        </div>
      </div>
    </section>

    <!-- Bento Grid Section: Key Technical Indicators & Core Stack -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b-[3px] md:border-b-[4px] border-black dark:border-white">
      
      <!-- Metric Tile 1 -->
      <div class="p-6 sm:p-8 border-b-[3px] md:border-b-0 md:border-r-[3px] lg:border-r-[4px] border-black dark:border-white bg-[#FFFDF0] dark:bg-[#121214]">
        <div class="font-mono text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">
          CONCURRENCY THROUGHPUT
        </div>
        <div class="font-sans font-black text-5xl sm:text-6xl text-black dark:text-white leading-none">
          1.2M+
        </div>
        <p class="font-mono text-xs text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
          RPS xử lý đồng thời qua Goroutines & DBOS Workflows không mất trạng thái (Zero State Loss).
        </p>
      </div>

      <!-- Metric Tile 2 -->
      <div class="p-6 sm:p-8 border-b-[3px] md:border-b-0 lg:border-r-[4px] border-black dark:border-white bg-white dark:bg-[#151518]">
        <div class="font-mono text-xs font-bold text-[#00FF66] uppercase tracking-widest mb-1">
          AI HERMENEUTICS CORPUS
        </div>
        <div class="font-sans font-black text-5xl sm:text-6xl text-[#00FF66] leading-none">
          8.77M
        </div>
        <p class="font-mono text-xs text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
          Đoạn luận giải v4.0 (56.6 GB) tích hợp khẩu quyết Thiên Kỷ Nghê Hải Hà và 1100+ cách cục cổ tịch.
        </p>
      </div>

      <!-- Metric Tile 3 -->
      <div class="p-6 sm:p-8 border-b-[3px] md:border-b-0 md:border-r-[3px] lg:border-r-[4px] border-black dark:border-white bg-[#FFFDF0] dark:bg-[#121214]">
        <div class="font-mono text-xs font-bold text-[#FF007A] uppercase tracking-widest mb-1">
          P99 RESPONSE LATENCY
        </div>
        <div class="font-sans font-black text-5xl sm:text-6xl text-[#FF007A] leading-none">
          &lt; 9.8ms
        </div>
        <p class="font-mono text-xs text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
          Đo đạc thực tế tại Edge CDN, tối ưu bộ nhớ cấp phát và thời gian phản hồi cơ học 80ms - 120ms.
        </p>
      </div>

      <!-- Metric Tile 4 -->
      <div class="p-6 sm:p-8 bg-white dark:bg-[#151518]">
        <div class="font-mono text-xs font-bold text-[#00F0FF] uppercase tracking-widest mb-1">
          DESIGN ACCREDITATION
        </div>
        <div class="font-sans font-black text-5xl sm:text-6xl text-[#00F0FF] leading-none">
          AAA
        </div>
        <p class="font-mono text-xs text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
          Đạt chuẩn tương phản tối cao WCAG AAA (21:1 trên nền đen OLED và 17.5:1 trên nền vàng Acid).
        </p>
      </div>

    </section>

    <!-- Core Stack & Specialization Matrix -->
    <section class="grid grid-cols-1 lg:grid-cols-12 border-b-[3px] md:border-b-[4px] border-black dark:border-white">
      
      <!-- Left (7 Cols): Core Engineering Stack -->
      <div class="lg:col-span-7 p-6 sm:p-8 md:p-10 border-b-[3px] lg:border-b-0 lg:border-r-[4px] border-black dark:border-white bg-white dark:bg-[#0E0E10] space-y-6">
        <div>
          <div class="font-mono text-xs font-black uppercase text-[#FF007A] tracking-wider mb-2">
            ■ CHUYÊN MÔN NÒNG CỐT & CÔNG NGHỆ CHÍNH (TECH STACK)
          </div>
          <h2 class="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white">
            VẬN HÀNH TOÀN DIỆN TỪ BARE-METAL ĐẾN TRẢI NGHIỆM CLIENT
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Stack Card 1 -->
          <div class="p-4 border-[2px] border-black dark:border-white bg-neutral-100 dark:bg-[#18181B] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF]">
            <div class="font-mono text-xs font-bold text-[#00F0FF] mb-1">01 / DISTRIBUTED SYSTEMS</div>
            <div class="font-sans font-black text-base uppercase text-black dark:text-white">GO &bull; DBOS &bull; RUST</div>
            <p class="text-xs text-neutral-600 dark:text-neutral-300 mt-2 leading-relaxed">
              Xây dựng microservices, durable execution workflows, connection pooling, xử lý đồng thời cao và phân tán an toàn dữ liệu.
            </p>
          </div>

          <!-- Stack Card 2 -->
          <div class="p-4 border-[2px] border-black dark:border-white bg-neutral-100 dark:bg-[#18181B] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF]">
            <div class="font-mono text-xs font-bold text-[#00FF66] mb-1">02 / AI & VECTOR HERMENEUTICS</div>
            <div class="font-sans font-black text-base uppercase text-black dark:text-white">GEMINI 3.8 &bull; SHARD VECTORS</div>
            <p class="text-xs text-neutral-600 dark:text-neutral-300 mt-2 leading-relaxed">
              Tích hợp AI mô hình ngôn ngữ lớn, kiến trúc truy vấn đa chiều (RAG), vector similarity search trên tập dữ liệu 56.6 GB.
            </p>
          </div>

          <!-- Stack Card 3 -->
          <div class="p-4 border-[2px] border-black dark:border-white bg-neutral-100 dark:bg-[#18181B] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF]">
            <div class="font-mono text-xs font-bold text-[#FFE600] mb-1">03 / MODERN FRONTEND & FSM</div>
            <div class="font-sans font-black text-base uppercase text-black dark:text-white">SVELTE 5 &bull; ARK UI &bull; TAILWIND</div>
            <p class="text-xs text-neutral-600 dark:text-neutral-300 mt-2 leading-relaxed">
              Quản lý trạng thái máy hữu hạn Zag.js, Svelte 5 Runes siêu tốc, thiết kế Hyper Neo-Brutalism đanh gọn không jank.
            </p>
          </div>

          <!-- Stack Card 4 -->
          <div class="p-4 border-[2px] border-black dark:border-white bg-neutral-100 dark:bg-[#18181B] shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF]">
            <div class="font-mono text-xs font-bold text-[#FF007A] mb-1">04 / BARE-METAL & ZERO TRUST</div>
            <div class="font-sans font-black text-base uppercase text-black dark:text-white">DEVOPS &bull; CLOUDFLARE 6-PHASE</div>
            <p class="text-xs text-neutral-600 dark:text-neutral-300 mt-2 leading-relaxed">
              Tự động hóa host thực, tinh chỉnh Linux kernel, pipeline kiểm thử bảo mật độc lập và chống rò rỉ credential.
            </p>
          </div>
        </div>

        <!-- Quote sticker -->
        <div class="p-4 bg-[#FFE600] text-black dark:bg-[#181600] dark:text-zinc-100 border-[3px] border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF]">
          <div class="font-mono text-xs font-black uppercase text-black dark:text-[#FFE600]">💡 TRIẾT LÝ HÀNH ĐỘNG:</div>
          <div class="font-sans text-xs sm:text-sm font-bold mt-1 leading-relaxed">
            "Không sao chép giải pháp mù quáng. Luôn phân rã bài toán về nguyên lý cơ bản nhất, viết lượng code tối thiểu cần thiết để giải quyết triệt để vấn đề, và đo đạc kết quả bằng các chỉ số kỹ thuật thực chiến."
          </div>
        </div>
      </div>

      <!-- Right (5 Cols): 6 Pillars of Quality Architecture -->
      <div class="lg:col-span-5 p-6 sm:p-8 md:p-10 bg-[#FFFDF0] dark:bg-[#141416] space-y-4">
        <div>
          <div class="font-mono text-xs font-black uppercase text-[#00F0FF] tracking-wider mb-1">
            ■ HỆ QUY CHIẾU CHẤT LƯỢNG
          </div>
          <h3 class="font-sans font-black text-xl sm:text-2xl uppercase tracking-tight text-black dark:text-white">
            6 TRỤ CỘT KIẾN TRÚC PHẦN MỀM (6 PILLARS)
          </h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Bấm vào từng trụ cột để xem nguyên tắc thực thi:
          </p>
        </div>

        <Accordion items={pillarsAccordion} />
      </div>

    </section>

    <!-- Flagship Production Platforms Section -->
    <section class="p-6 sm:p-8 md:p-12 border-b-[3px] md:border-b-[4px] border-black dark:border-white bg-white dark:bg-[#0E0E10] space-y-8">
      <div>
        <div class="font-mono text-xs font-black uppercase text-[#FFE600] tracking-wider mb-2">
          ■ SẢN PHẨM & NỀN TẢNG TIÊU BIỂU (FLAGSHIP PLATFORMS)
        </div>
        <h2 class="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-black dark:text-white">
          NHỮNG DỰ ÁN TÂM HUYẾT ĐÃ HIỆN THỰC HÓA
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <!-- Project 1: EngBbq -->
        <Card title="ENGBBQ PLATFORM (ENGBBQ.ME)" badge="LIVE" badgeColor="yellow">
          <div class="space-y-4">
            <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              Nền tảng học ngoại ngữ nhận thức đột phá, loại bỏ phương pháp học vẹt truyền thống bằng cách giải quyết 4 rào cản tâm lý cốt lõi: 
              <strong>Nghịch lý Nỗ lực (The Effort Paradox)</strong>, <strong>Sự trốn tránh vô thức (Cognitive Avoidance)</strong>, 
              <strong>Tâm lý sợ phán xét (Fear of Judgment)</strong> và <strong>Khủng hoảng định danh (Identity Crisis)</strong>.
            </p>

            <div class="space-y-1.5 font-mono text-xs">
              <div class="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1">
                <span class="text-neutral-500">BACKEND RUNTIME:</span>
                <span class="font-bold text-black dark:text-white">Go + DBOS Workflows</span>
              </div>
              <div class="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1">
                <span class="text-neutral-500">CLIENT ENGINE:</span>
                <span class="font-bold text-black dark:text-white">Svelte 5 Runes &bull; Ark UI FSM</span>
              </div>
              <div class="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1">
                <span class="text-neutral-500">INTERACTION:</span>
                <span class="font-bold text-[#FF007A]">Web Haptics Feedback</span>
              </div>
            </div>

            <div class="pt-2 flex flex-wrap gap-2">
              <a
                href="https://engbbq.me"
                target="_blank"
                rel="noreferrer"
                class="btn-tactile px-4 py-2 font-mono text-xs font-black uppercase bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] inline-flex items-center gap-1.5"
              >
                TRUY CẬP ENGBBQ.ME &rarr;
              </a>
              <Button variant="secondary" size="sm" onclick={() => copyContact('https://engbbq.me', 'URL EngBbq')}>
                SAO CHÉP LIÊN KẾT
              </Button>
            </div>
          </div>
        </Card>

        <!-- Project 2: Tianji Ziwei AI Hermeneutics -->
        <Card title="TIANJI ZIWEI AI COMPASS" badge="8.77M VECTOR" badgeColor="cyan">
          <div class="space-y-4">
            <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              Hệ thống giải đoán Tử Vi Đẩu Số cao cấp kế thừa trực tiếp 1848 khẩu quyết chính tông của danh sư Nghê Hải Hà (*Thiên Kỷ*), 
              kết hợp Tử Vi Đẩu Số Toàn Thư, Cốt Tủy Phú và kho tri thức khổng lồ <strong>8,77 triệu đoạn luận giải v4.0 (56.6 GB)</strong>, 
              trả lời 100% bằng Tiếng Việt chuẩn mực âm Hán-Việt với mô hình tư duy cao nhất.
            </p>

            <div class="space-y-1.5 font-mono text-xs">
              <div class="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1">
                <span class="text-neutral-500">KNOWLEDGE BASE:</span>
                <span class="font-bold text-black dark:text-white">8,771,688 Sharded Vectors (56.6 GB)</span>
              </div>
              <div class="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1">
                <span class="text-neutral-500">PATTERNS CATALOG:</span>
                <span class="font-bold text-black dark:text-white">1,100+ Cách cục cổ tịch</span>
              </div>
              <div class="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1">
                <span class="text-neutral-500">AI INFERENCE:</span>
                <span class="font-bold text-[#00FF66]">Gemini 3.8 Flash High</span>
              </div>
            </div>

            <div class="pt-2 flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onclick={() => {
                toastType = 'info';
                toastMsg = 'Kho tri thức Tianji v4.0 đã sẵn sàng phục vụ 674,976 tinh bàn lá số!';
                isToastVisible = true;
              }}>
                KIỂM TRA TRẠNG THÁI SHARD AI
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>

    <!-- Interactive Telemetry Terminal Section -->
    <section id="terminal-section" class="p-6 sm:p-8 md:p-12 border-b-[3px] md:border-b-[4px] border-black dark:border-white bg-[#FFFDF0] dark:bg-[#121214]">
      <div class="max-w-4xl mx-auto">
        <div class="flex justify-between items-center mb-4">
          <div>
            <div class="font-mono text-xs font-black uppercase text-[#00FF66] tracking-wider mb-1">
              ■ GIAO DIỆN DÒNG LỆNH TƯƠNG TÁC (CLI TERMINAL)
            </div>
            <h3 class="font-sans font-black text-2xl uppercase tracking-tight text-black dark:text-white">
              ZERA INTERACTIVE RADAR & TELEMETRY
            </h3>
          </div>
          <Badge variant="lime">ONLINE</Badge>
        </div>

        <!-- Terminal Box -->
        <div class="border-[3px] md:border-[4px] border-black dark:border-white shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_#FFFFFF] bg-black text-white p-4 sm:p-6 font-mono text-xs sm:text-sm">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-neutral-700 text-[#FFE600] font-black">
            <span>ZERA@ENGBBQ-PRODUCTION: ~</span>
            <span>UTF-8 // RUNES ACTIVE</span>
          </div>

          <!-- History Buffer -->
          <div class="h-48 sm:h-56 overflow-y-auto space-y-1.5 text-xs font-mono mb-4 pr-1">
            {#each terminalHistory as item}
              <div class="{item.type === 'input' ? 'text-[#00FF66] font-bold' : item.type === 'error' ? 'text-[#FF007A]' : 'text-neutral-300'} whitespace-pre-line leading-relaxed">
                {item.text}
              </div>
            {/each}
          </div>

          <!-- Command Input (min-text 16px on mobile prevents iOS Safari auto-zoom) -->
          <form onsubmit={(e) => { e.preventDefault(); executeTerminal(terminalInput); }} class="flex items-center gap-2">
            <span class="text-[#00FF66] font-bold text-sm">➜ ~</span>
            <input
              type="text"
              bind:value={terminalInput}
              placeholder="gõ 'help', 'bio', 'stack', 'projects', 'contact'..."
              class="flex-1 bg-transparent text-white outline-none border-b border-neutral-700 pb-1 text-base sm:text-sm font-mono placeholder:text-neutral-600 focus:border-[#FFE600]"
            />
          </form>

          <!-- Quick Command Badges -->
          <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-neutral-800 text-[10px] sm:text-xs">
            <span class="text-neutral-500 uppercase py-0.5">Lệnh nhanh:</span>
            <button onclick={() => executeTerminal('bio')} class="px-2 py-0.5 bg-neutral-800 hover:bg-[#FFE600] hover:text-black text-white border border-neutral-700 cursor-pointer">bio</button>
            <button onclick={() => executeTerminal('stack')} class="px-2 py-0.5 bg-neutral-800 hover:bg-[#00F0FF] hover:text-black text-white border border-neutral-700 cursor-pointer">stack</button>
            <button onclick={() => executeTerminal('projects')} class="px-2 py-0.5 bg-neutral-800 hover:bg-[#00FF66] hover:text-black text-white border border-neutral-700 cursor-pointer">projects</button>
            <button onclick={() => executeTerminal('philosophy')} class="px-2 py-0.5 bg-neutral-800 hover:bg-[#FF007A] hover:text-white text-white border border-neutral-700 cursor-pointer">philosophy</button>
            <button onclick={() => executeTerminal('contact')} class="px-2 py-0.5 bg-neutral-800 hover:bg-[#FFE600] hover:text-black text-white border border-neutral-700 cursor-pointer">contact</button>
            <button onclick={() => executeTerminal('components')} class="px-2 py-0.5 bg-neutral-800 hover:bg-[#00F0FF] hover:text-black text-white border border-neutral-700 cursor-pointer">components</button>
            <button onclick={() => executeTerminal('clear')} class="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-600 text-neutral-400 border border-neutral-700 cursor-pointer">clear</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Action Banner to Component Showroom -->
    <section class="p-6 sm:p-8 md:p-10 bg-[#FFE600] text-black dark:bg-[#141200] dark:text-zinc-100 border-b-[3px] md:border-b-[4px] border-black dark:border-white flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <div class="font-mono text-xs font-black uppercase tracking-widest text-black dark:text-[#FFE600]">
          ⚡ TÒ MÒ VỀ HỆ THỐNG GIAO DIỆN HYPER NEO-BRUTALISM?
        </div>
        <h3 class="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white mt-1">
          TRUY CẬP PHÒNG TRƯNG BÀY TẤT CẢ COMPONENT (SHOWROOM LAB)
        </h3>
        <p class="font-sans text-xs sm:text-sm font-semibold text-neutral-800 dark:text-zinc-300 max-w-xl mt-1">
          Khám phá trọn bộ nút bấm cơ học, form nhập liệu, bộ chọn Select, Accordion, Tab điều hướng, Bottom Drawer và Toast Alerts tương tác trực tiếp.
        </p>
      </div>

      <button
        onclick={() => { triggerHaptic('heavyClick'); onnavigate?.('components'); }}
        class="btn-tactile px-6 py-4 font-mono text-sm font-black uppercase bg-black text-white hover:bg-neutral-800 border-[3px] border-black shadow-[4px_4px_0px_#000] dark:bg-[#1C1900] dark:text-[#FFE600] dark:border-white dark:shadow-[4px_4px_0px_#FFFFFF] dark:hover:bg-[#FFE600] dark:hover:text-black active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer shrink-0"
      >
        MỞ COMPONENT LAB NGAY &rarr;
      </button>
    </section>

    <!-- Footer -->
    <footer class="p-6 sm:p-8 bg-black text-white font-mono text-xs flex flex-col sm:flex-row justify-between items-center gap-4">
      <div>
        <strong>ZERA (MONKEYDHAFY)</strong> &bull; PRINCIPAL SOLUTIONS ARCHITECT &bull; 2026
      </div>
      <div class="flex items-center gap-4 text-[#FFE600]">
        <a href="https://github.com/monkeydhafy-create" target="_blank" rel="noreferrer" class="hover:underline">GITHUB</a>
        <span>&bull;</span>
        <button onclick={() => { isContactModalOpen = true; }} class="hover:underline cursor-pointer">LIÊN HỆ</button>
        <span>&bull;</span>
        <button onclick={() => onnavigate?.('components')} class="hover:underline cursor-pointer">COMPONENT LAB</button>
      </div>
    </footer>
  </div>

  <!-- Contact Modal Dialog -->
  <DialogDrawer bind:open={isContactModalOpen} title="THÔNG TIN LIÊN HỆ & KẾT NỐI KỸ THUẬT">
    <div class="space-y-4 font-sans text-sm">
      <p class="leading-relaxed">
        Rất vui được kết nối cùng bạn để trao đổi về các bài toán <strong>Kiến trúc Hệ thống phân tán</strong>, <strong>Kỹ thuật AI mô hình lớn</strong>, hoặc tư vấn triển khai hạ tầng High-Performance.
      </p>

      <div class="space-y-2.5 font-mono text-xs pt-2">
        <div class="p-3 bg-neutral-100 dark:bg-[#18181B] border-2 border-black dark:border-white flex justify-between items-center">
          <div>
            <div class="text-neutral-500 uppercase text-[10px]">GITHUB REPOSITORY:</div>
            <div class="font-bold text-black dark:text-white">github.com/monkeydhafy-create</div>
          </div>
          <Button variant="secondary" size="sm" onclick={() => copyContact('https://github.com/monkeydhafy-create', 'GitHub')}>
            COPY
          </Button>
        </div>

        <div class="p-3 bg-neutral-100 dark:bg-[#18181B] border-2 border-black dark:border-white flex justify-between items-center">
          <div>
            <div class="text-neutral-500 uppercase text-[10px]">PRODUCTION HOST:</div>
            <div class="font-bold text-[#FF007A]">engbbq.me</div>
          </div>
          <Button variant="secondary" size="sm" onclick={() => copyContact('https://engbbq.me', 'Domain')}>
            COPY
          </Button>
        </div>
      </div>

      <div class="p-3 bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] border-2 border-black dark:border-white font-mono text-xs font-bold">
        STATUS: Đang mở nhận tư vấn kiến trúc & dự án AI kỹ thuật chuyên sâu.
      </div>

      <div class="pt-2 flex justify-end">
        <Button variant="primary" onclick={() => isContactModalOpen = false}>
          ĐÓNG HỘP THOẠI
        </Button>
      </div>
    </div>
  </DialogDrawer>

  <!-- Toast Notification -->
  <Toast
    bind:visible={isToastVisible}
    title="HỆ THỐNG THÔNG BÁO"
    message={toastMsg}
    type={toastType}
  />
</div>

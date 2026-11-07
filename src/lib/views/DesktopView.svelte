<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Loader from '$lib/components/Loader.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import Input from '$lib/components/Input.svelte';
  import Accordion from '$lib/components/Accordion.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import Switch from '$lib/components/Switch.svelte';
  import SelectPicker from '$lib/components/SelectPicker.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import DialogDrawer from '$lib/components/DialogDrawer.svelte';

  interface Props {
    isDark?: boolean;
    ontoggleTheme?: () => void;
  }

  let { isDark = false, ontoggleTheme }: Props = $props();

  // Dialog & Toast states
  let isModalOpen = $state(false);
  let isToastVisible = $state(false);
  let toastType = $state<'success' | 'warning' | 'error' | 'info'>('success');
  let toastMsg = $state('Đã áp dụng thay đổi hệ thống thành công.');

  // Controls state
  let activePillarTab = $state('pillar-1');
  let autoSync = $state(true);
  let hapticSound = $state(true);
  let selectedEngine = $state('go');
  let selectedZodiac = $state('ziwei');

  // Terminal state
  interface HistoryItem {
    type: 'input' | 'output' | 'error';
    text: string;
  }
  let terminalInput = $state('');
  let terminalHistory = $state<HistoryItem[]>([
    { type: 'output', text: 'EngBbq & Tianji Telemetry Radar [v2.4.0 // Hyper Neo-Brutalism]' },
    { type: 'output', text: 'Type "help" to view diagnostic commands: status, engbbq, tianji, stack, whoami, clear.' }
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
          text: 'AVAILABLE COMMANDS:\n  • status   - Check production node health\n  • engbbq   - Inspect EngBbq cognitive language framework\n  • tianji   - Inspect Tianji AI 8.77M vector dataset\n  • stack    - Print runtime tech stack\n  • clear    - Clear terminal buffer\n  • whoami   - Show developer identity' 
        });
        break;
      case 'status':
        terminalHistory.push({ 
          type: 'output', 
          text: '[OK] Host: engbbq.me (GitHub Pages Edge CDN)\n[OK] Engine: Svelte 5 (Runes Architecture)\n[OK] Design: Hyper Neo-Brutalism × Ark UI (WCAG AAA)\n[OK] P99 Latency: 9.8ms | State Machine: Active' 
        });
        break;
      case 'engbbq':
        terminalHistory.push({ 
          type: 'output', 
          text: 'PLATFORM: EngBbq (https://engbbq.me)\nPillars: Effort Paradox (A), Avoidance (B), Fear of Judgment (C), Identity Crisis (D)\nRuntime: Go + DBOS Workflows, Flutter, MariaDB, Redis, GCP BigQuery' 
        });
        break;
      case 'tianji':
        terminalHistory.push({ 
          type: 'output', 
          text: 'TIANJI ZIWEI AI HERMENEUTICS:\nCorpus: 8,771,688 Interpretations (v4.0, 56.6 GB)\nPatterns: 1100+ Classical Patterns (Tử Vi Đẩu Số Toàn Thư / Cốt Tủy Phú)\nModel: Gemini 3.8 Flash High (100% Tiếng Việt chuẩn mực)' 
        });
        break;
      case 'stack':
        terminalHistory.push({ 
          type: 'output', 
          text: 'SYSTEM TECH STACK:\n  • Languages: Go, TypeScript, Svelte 5, Dart, Python, Rust\n  • UI Primitives: Ark UI (Zag.js FSM), Tailwind CSS v4\n  • Performance: Zero-Jank Mechanical Timings, Web Haptics' 
        });
        break;
      case 'whoami':
        terminalHistory.push({ 
          type: 'output', 
          text: 'Zera — Principal Solutions Architect & AI Engineering Lead\nRepo: github.com/monkeydhafy-create/monkeydhafy-create.github.io' 
        });
        break;
      case 'clear':
        terminalHistory = [];
        break;
      default:
        terminalHistory.push({ 
          type: 'error', 
          text: `Command not recognized: "${trimmed}". Type "help" for instructions.` 
        });
        break;
    }
    terminalInput = '';
  }

  const pillarTabs = [
    { id: 'pillar-1', label: '01 / EFFORT PARADOX', badge: 'NGHỊCH LÝ NỖ LỰC' },
    { id: 'pillar-2', label: '02 / COGNITIVE AVOIDANCE', badge: 'TRỐNG TRÁNH' },
    { id: 'pillar-3', label: '03 / FEAR OF JUDGMENT', badge: 'TÂM LÝ SỢ SAI' },
    { id: 'pillar-4', label: '04 / IDENTITY CRISIS', badge: 'ĐỊNH DANH' },
  ];

  const engineOptions = [
    { value: 'go', label: 'GO CONCURRENCY ENGINE', badge: '1.2M RPS' },
    { value: 'dbos', label: 'DBOS DURABLE WORKFLOWS', badge: '99.99%' },
    { value: 'tianji', label: 'TIANJI VECTOR SHARD V4.0', badge: '8.77M' },
  ];

  const zodiacOptions = [
    { value: 'ziwei', label: 'TỬ VI ĐẾ TINH // CUNG TÝ', badge: 'ĐẾ VƯƠNG' },
    { value: 'tianfu', label: 'THIÊN PHỦ KIM TINH // CUNG MÙI', badge: 'KHO TÀNG' },
    { value: 'qisha', label: 'THẤT SÁT TRIỀU ĐẨU // CUNG NGỌ', badge: 'TƯỚNG QUÂN' },
    { value: 'tanlang', label: 'THAM LANG ĐỒNG ĐỘ // CUNG DẦN', badge: 'PHÚC THỌ' },
  ];

  const accordionItems = [
    {
      id: 'spec-1',
      title: 'DURABLE STATE WORKFLOW MODEL (DBOS)',
      badge: 'PERSISTENCE',
      content: 'Kiến trúc bảo toàn trạng thái 100% khi xảy ra sự cố node mạng. Mọi lượt hội thoại học ngữ cảnh đều được lưu vết dạng transaction trên cơ sở dữ liệu phân tán.'
    },
    {
      id: 'spec-2',
      title: 'ARK UI STATE MACHINE ENGINE (ZAG.JS)',
      badge: 'FSM',
      content: 'Toàn bộ hành vi phím bấm (Arrow keys, Esc, Tab), bẫy tiêu điểm (focus trap) được điều khiển bởi máy trạng thái hữu hạn, triệt tiêu 100% race-condition.'
    },
    {
      id: 'spec-3',
      title: '8-POINT SPATIAL CADENCE & ZERO-BLUR SHADOWS',
      badge: 'BRUTAL',
      content: 'Mọi khoảng cách chia hết cho 8px. Mọi bóng đổ góc 90 độ với bán kính mờ r = 0px. Tương phản đạt chuẩn WCAG AAA tối cao.'
    }
  ];
</script>

<div class="hidden lg:block min-h-screen bg-brutal-dots transition-colors duration-150 p-8 xl:p-12 text-black dark:text-white">
  <!-- Desktop Masthead Container (1200px Grid) -->
  <div class="max-w-[1240px] mx-auto bg-white dark:bg-[#0E0E10] border-[4px] border-black dark:border-white shadow-[16px_16px_0px_#000] dark:shadow-[16px_16px_0px_#FFFFFF] overflow-hidden">
    
    <!-- Top Masthead Header Bar -->
    <header class="grid grid-cols-[100px_1fr_auto] border-b-[4px] border-black dark:border-white bg-white dark:bg-[#09090B]">
      <div class="bg-[#FF007A] text-white dark:bg-[#200412] dark:text-[#FF1A8C] flex items-center justify-center font-mono font-black text-2xl border-r-[4px] border-black dark:border-white">
        CH
      </div>
      <div class="px-8 py-5 flex items-center justify-between">
        <div>
          <h1 class="font-sans font-black text-3xl uppercase tracking-tight text-black dark:text-white leading-none">
            ENGBBQ &bull; DESKTOP WORKSPACE
          </h1>
          <p class="font-mono text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wider">
            SYSTEM ARCHITECTURE &bull; REVISION 2026.04 &bull; 12-COLUMN MATRIX
          </p>
        </div>
        <div class="flex items-center gap-3">
          <Badge variant="lime">ONLINE 100%</Badge>
          <Badge variant="cyan">ARK UI FSM</Badge>
          <Badge variant="yellow">SVELTE 5 RUNES</Badge>
        </div>
      </div>
      <div class="border-l-[4px] border-black dark:border-white p-4 flex items-center gap-3 bg-neutral-100 dark:bg-[#18181B]">
        <button
          onclick={ontoggleTheme}
          class="btn-tactile px-4 py-2 font-mono text-xs font-black uppercase bg-[#FFE600] text-black dark:bg-[#18181B] dark:text-[#FFE600] border-[2px] border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
        >
          {isDark ? '☀️ LIGHT MODE' : '🌙 DARK MODE'}
        </button>
      </div>
    </header>

    <!-- Main Workspace Area (12-Col Grid) -->
    <div class="grid grid-cols-12 border-b-[4px] border-black dark:border-white">
      
      <!-- Left Column (8 of 12 Cols) - Core Architectural Showcases -->
      <div class="col-span-8 p-10 border-r-[4px] border-black dark:border-white bg-white dark:bg-[#0E0E10] space-y-8">
        
        <!-- Hero Section -->
        <div>
          <div class="flex gap-2 mb-4">
            <Badge variant="yellow" rotate="left">PRINCIPAL ARCHITECTURE</Badge>
            <Badge variant="magenta">ZERO CORPORATE BOREDOM</Badge>
            <Badge variant="lime">WCAG AAA ACCREDITED</Badge>
          </div>

          <h2 class="font-sans font-black text-4xl lg:text-6xl text-black dark:text-white uppercase leading-[1.2] tracking-normal mb-6 break-words max-w-full">
            COGNITIVE<br>RETRIEVAL ENGINE.<br>
            <span class="bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] px-2.5 py-1 border-[3px] border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] inline-block mt-2 max-w-full break-words leading-snug">
              UNAPOLOGETIC.
            </span>
          </h2>

          <p class="font-sans text-lg text-neutral-700 dark:text-neutral-300 max-w-xl leading-relaxed">
            Phá vỡ sự đơn điệu của các giao diện SaaS hiện đại. Mực đen sắc nét 4px, bóng cứng 8px góc 90 độ, 
            hệ thống máy trạng thái hữu hạn Ark UI (Zag.js) đảm bảo 100% không bao giờ xảy ra race-condition.
          </p>

          <div class="flex gap-4 mt-6">
            <Button variant="primary" size="lg" onclick={() => isModalOpen = true}>
              MỞ SYSTEM MODAL &rarr;
            </Button>
            <Button variant="secondary" size="lg" onclick={() => { toastType = 'success'; toastMsg = 'Đã sao chép cấu hình JSON vào bộ nhớ đệm.'; isToastVisible = true; }}>
              KÍCH HOẠT TOAST ALERT
            </Button>
            <Button variant="outline" size="lg" onclick={() => { toastType = 'warning'; toastMsg = 'Đang đồng bộ shard dữ liệu Tianji v4.0...'; isToastVisible = true; }}>
              ĐỒNG BỘ TELEMETRY
            </Button>
          </div>
        </div>

        <!-- Section 1: EngBbq 4-Pillar Cognitive Model with Tabs -->
        <div class="pt-4 border-t-[3px] border-black dark:border-zinc-800">
          <div class="flex justify-between items-center mb-4">
            <div class="font-mono text-xs font-black uppercase text-[#FF007A] tracking-wider">
              ■ 01 / ENGBBQ COGNITIVE LANGUAGE ARCHITECTURE
            </div>
            <span class="font-mono text-xs text-neutral-500 uppercase">4 PILLARS MODEL</span>
          </div>

          <Tabs items={pillarTabs} bind:activeId={activePillarTab} />

          <div class="mt-4">
            {#if activePillarTab === 'pillar-1'}
              <Card title="NGHỊCH LÝ NỖ LỰC (THE EFFORT PARADOX)" badge="PILLAR A" badgeColor="yellow">
                <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
                  Càng cố gắng ghi nhớ từ vựng theo cách học thuộc lòng truyền thống, não bộ càng nhanh chóng quên đi khi vào ngữ cảnh thực chiến. 
                  EngBbq giải quyết bằng cơ chế kích hoạt phản xạ vô thức đa tầng (Unconscious Reflex).
                </p>
                <Loader progress={92} label="COGNITIVE ACQUISITION RATE" variant="yellow" />
              </Card>
            {:else if activePillarTab === 'pillar-2'}
              <Card title="SỰ TRỐN TRÁNH VÔ THỨC (COGNITIVE AVOIDANCE)" badge="PILLAR B" badgeColor="cyan">
                <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
                  Não bộ người học có xu hướng né tránh các cấu trúc câu phức tạp và chỉ dùng các từ cơ bản. 
                  Hệ thống ép phản xạ qua các tình huống giả định áp lực cao với thời gian phản hồi dưới 3 giây.
                </p>
                <Loader progress={78} label="AVOIDANCE OVERCOMING SCORE" variant="cyan" />
              </Card>
            {:else if activePillarTab === 'pillar-3'}
              <Card title="TÂM LÝ SỢ BỊ PHÁN XÉT (FEAR OF JUDGMENT)" badge="PILLAR C" badgeColor="magenta">
                <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
                  Rào cản tâm lý lớn nhất của người Việt là sợ phát âm sai ngữ điệu. 
                  EngBbq ứng dụng AI Voice Cloning tạo môi trường an toàn tuyệt đối không phán xét.
                </p>
                <Loader progress={85} label="CONFIDENCE VECTOR INDEX" variant="magenta" />
              </Card>
            {:else}
              <Card title="KHỦNG HOẢNG ĐỊNH DANH NGÔN NGỮ (IDENTITY CRISIS)" badge="PILLAR D" badgeColor="lime">
                <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
                  Chuyển hóa người học từ trạng thái "dịch thầm tiếng Việt trong đầu" sang trạng thái tư duy trực tiếp bằng tiếng Anh như một ngôn ngữ thứ nhất.
                </p>
                <Loader progress={96} label="NEURAL ASSIMILATION LEVEL" variant="lime" />
              </Card>
            {/if}
          </div>
        </div>

        <!-- Section 2: Tianji Ziwei AI Hermeneutics Engine -->
        <div class="pt-4 border-t-[3px] border-black dark:border-zinc-800">
          <div class="flex justify-between items-center mb-4">
            <div class="font-mono text-xs font-black uppercase text-[#00F0FF] tracking-wider">
              ■ 02 / TIANJI ZIWEI AI COMPASS (8.77M VECTOR DATASET)
            </div>
            <Badge variant="cyan">GEMINI 3.8 FLASH HIGH</Badge>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <SelectPicker 
              label="CHỌN TINH BÀN MỆNH VỊ" 
              options={zodiacOptions} 
              bind:value={selectedZodiac} 
            />

            <SelectPicker 
              label="CHỌN ENGINE TÍNH TOÁN" 
              options={engineOptions} 
              bind:value={selectedEngine} 
            />
          </div>

          <Card title="KẾT QUẢ ĐỐI SOÁT CỔ TỊCH CHÍNH TÔNG NGHÊ HẢI HÀ" badge="8.77M SHARD" badgeColor="lime">
            <p class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">
              Mệnh tọa <strong>{zodiacOptions.find(z => z.value === selectedZodiac)?.label}</strong>. Kế thừa nguyên bản 1848 câu khẩu quyết Thiên Kỷ, 
              kết hợp Tử Vi Đẩu Số Toàn Thư và Cốt Tủy Phú. Toàn bộ luận giải bằng Tiếng Việt chuẩn mực, âm Hán-Việt chính tông.
            </p>
            <div class="p-3 bg-neutral-100 dark:bg-[#18181B] font-mono text-xs border-2 border-black dark:border-white text-black dark:text-white">
              CÁCH CỤC: Phủ Tướng Triều Viên &bull; LỘC MÃ GIAO TRÌ &bull; QUY CÁCH: THƯỢNG CÁCH
            </div>
          </Card>
        </div>

        <!-- Section 3: Interactive Accordion Specifications -->
        <div class="pt-4 border-t-[3px] border-black dark:border-zinc-800">
          <div class="font-mono text-xs font-black uppercase text-neutral-500 mb-3">
            ■ 03 / SYSTEM ARCHITECTURAL SPECIFICATION ACCORDION
          </div>
          <Accordion items={accordionItems} />
        </div>

        <!-- Section 4: Live Component Playground Showcase -->
        <div class="pt-4 border-t-[3px] border-black dark:border-zinc-800">
          <div class="font-mono text-xs font-black uppercase text-[#FFE600] tracking-wider mb-4">
            ■ 04 / INTERACTIVE COMPONENT SUITE PLAYGROUND
          </div>

          <div class="grid grid-cols-3 gap-4 p-5 border-[3px] border-black dark:border-white bg-[#FFFDF0] dark:bg-[#18181B]">
            <div>
              <div class="font-mono text-[10px] font-bold uppercase text-neutral-500 mb-2">BUTTON PALETTE:</div>
              <div class="space-y-2">
                <Button variant="primary" size="sm" class="w-full">PRIMARY BTN</Button>
                <Button variant="secondary" size="sm" class="w-full">SECONDARY BTN</Button>
                <Button variant="danger" size="sm" class="w-full">DANGER BTN</Button>
              </div>
            </div>

            <div>
              <div class="font-mono text-[10px] font-bold uppercase text-neutral-500 mb-2">SWITCH CONTROLS:</div>
              <div class="space-y-3">
                <Switch bind:checked={autoSync} label="TỰ ĐỘNG SYNC" />
                <Switch bind:checked={hapticSound} label="ÂM THANH PHẢN XẠ" />
              </div>
            </div>

            <div>
              <div class="font-mono text-[10px] font-bold uppercase text-neutral-500 mb-2">HATCHED SKELETON:</div>
              <div class="space-y-2">
                <Skeleton height="h-6" />
                <Skeleton height="h-6" />
                <Skeleton height="h-6" />
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column (4 of 12 Cols) - Telemetry & Terminal -->
      <div class="col-span-4 p-8 bg-[#FFFDF0] dark:bg-[#121214] flex flex-col justify-between space-y-6">
        <div>
          <div class="font-mono text-xs font-black uppercase text-[#FF007A] tracking-widest mb-4">
            ■ REAL-TIME TELEMETRY MATRIX
          </div>

          <!-- Metric Tile 1 -->
          <div class="bg-white dark:bg-[#18181B] border-[3px] border-black dark:border-white p-5 shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] mb-4">
            <div class="font-sans font-black text-5xl text-black dark:text-white leading-none">
              1,240
            </div>
            <div class="font-mono text-xs uppercase text-neutral-500 dark:text-neutral-400 mt-2 tracking-wider">
              REQ / SEC (GO RUNTIME)
            </div>
          </div>

          <!-- Metric Tile 2 -->
          <div class="bg-white dark:bg-[#18181B] border-[3px] border-black dark:border-white p-5 shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] mb-4">
            <div class="font-sans font-black text-5xl text-[#00FF66] leading-none">
              8.77M
            </div>
            <div class="font-mono text-xs uppercase text-neutral-500 dark:text-neutral-400 mt-2 tracking-wider">
              TIANJI VECTOR DATASET V4.0
            </div>
          </div>

          <!-- Metric Tile 3 -->
          <div class="bg-white dark:bg-[#18181B] border-[3px] border-black dark:border-white p-5 shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] mb-6">
            <div class="font-sans font-black text-5xl text-[#FF007A] leading-none">
              0.00ms
            </div>
            <div class="font-mono text-xs uppercase text-neutral-500 dark:text-neutral-400 mt-2 tracking-wider">
              FAIL-STOP DURABILITY LOSS
            </div>
          </div>

          <!-- Interactive CLI Terminal for Desktop -->
          <div class="border-[3px] border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] bg-black text-white p-4 font-mono text-xs">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-neutral-700 text-[#FFE600] font-black">
              <span>TERMINAL RADAR // CLI</span>
              <span>LIVE</span>
            </div>

            <!-- Terminal Buffer -->
            <div class="h-44 overflow-y-auto space-y-1 text-[11px] mb-3 pr-1">
              {#each terminalHistory as item}
                <div class="{item.type === 'input' ? 'text-[#00FF66]' : item.type === 'error' ? 'text-[#FF007A]' : 'text-neutral-300'} whitespace-pre-line leading-relaxed">
                  {item.text}
                </div>
              {/each}
            </div>

            <!-- Command Line Input -->
            <form onsubmit={(e) => { e.preventDefault(); executeTerminal(terminalInput); }} class="flex items-center gap-2">
              <span class="text-[#00FF66] font-bold">➜</span>
              <input
                type="text"
                bind:value={terminalInput}
                placeholder="type 'help' or command..."
                class="flex-1 bg-transparent text-white outline-none border-b border-neutral-700 pb-1 text-base md:text-xs font-mono"
              />
            </form>

            <div class="flex gap-1.5 mt-3 pt-2 border-t border-neutral-800 text-[9px] text-neutral-500 uppercase">
              <button onclick={() => executeTerminal('status')} class="hover:text-white cursor-pointer">[status]</button>
              <button onclick={() => executeTerminal('engbbq')} class="hover:text-white cursor-pointer">[engbbq]</button>
              <button onclick={() => executeTerminal('tianji')} class="hover:text-white cursor-pointer">[tianji]</button>
              <button onclick={() => executeTerminal('clear')} class="hover:text-white cursor-pointer">[clear]</button>
            </div>
          </div>
        </div>

        <div class="border-[2px] border-black dark:border-white p-4 bg-[#FFE600] text-black dark:bg-[#141200] dark:text-[#FFE600] font-mono text-xs font-bold shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF]">
          DESKTOP 12-COL FIXED MATRIX ACTIVE // DENSITY MAXIMAL
        </div>
      </div>
    </div>

    <!-- Desktop Footer Bar -->
    <footer class="p-6 bg-black text-white font-mono text-xs flex justify-between items-center border-t-[4px] border-black dark:border-white">
      <div>ENGBBQ COGNITIVE ARCHITECTURE &bull; MONKEYDHAFY-CREATE &bull; 2026</div>
      <div class="text-[#FFE600]">STRICT COMPONENT TOKENS VERIFIED &bull; ISO-2026.04</div>
    </footer>
  </div>

  <!-- Center Modal Dialog -->
  <DialogDrawer bind:open={isModalOpen} title="DESKTOP SYSTEM SPECIFICATION DIALOG">
    <div class="space-y-4">
      <p class="font-sans text-base leading-relaxed">
        Trên Desktop ($W \ge 1024px$), hộp thoại tự động căn giữa màn hình với viền 4px, bóng đổ 12px sắc nét và kích thước tối đa <code>max-w-lg</code>.
      </p>
      <div class="p-4 bg-[#FFFDF0] dark:bg-[#18181B] border-[2px] border-black dark:border-white font-mono text-xs">
        STATUS: Ark UI Zag State Machine &bull; Escape Key Active &bull; Focus Trapped
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <Button variant="primary" onclick={() => isModalOpen = false}>ĐÓNG HỘP THOẠI</Button>
      </div>
    </div>
  </DialogDrawer>

  <!-- Desktop Toast Alert -->
  <Toast 
    bind:visible={isToastVisible} 
    title="DESKTOP SYSTEM NOTIFICATION" 
    message={toastMsg}
    type={toastType}
  />
</div>

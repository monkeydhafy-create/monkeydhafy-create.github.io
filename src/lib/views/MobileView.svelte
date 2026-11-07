<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Loader from '$lib/components/Loader.svelte';
  import Accordion from '$lib/components/Accordion.svelte';
  import Switch from '$lib/components/Switch.svelte';
  import SelectPicker from '$lib/components/SelectPicker.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import DialogDrawer from '$lib/components/DialogDrawer.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import { triggerHaptic } from '$lib/constants/tokens';

  interface Props {
    isDark?: boolean;
    ontoggleTheme?: () => void;
  }

  let { isDark = false, ontoggleTheme }: Props = $props();

  let activeTab = $state('arena');
  let isDrawerOpen = $state(false);
  let isToastVisible = $state(false);
  let hapticEnabled = $state(true);
  let selectedLevel = $state('b2');
  let selectedZodiacMobile = $state('ziwei');
  let streakDays = $state(24);

  const mobileNavTabs = [
    { id: 'arena', label: '⚡ ARENA', badge: 'DAILY' },
    { id: 'words', label: '📖 WORDS', badge: '1.4K' },
    { id: 'tianji', label: '🔮 TIANJI', badge: '8.77M' },
    { id: 'cli', label: '💻 RADAR CLI', badge: 'LIVE' },
    { id: 'profile', label: '👤 PROFILE', badge: 'USER' },
  ];

  // Terminal state for mobile
  interface HistoryItem {
    type: 'input' | 'output' | 'error';
    text: string;
  }
  let terminalInput = $state('');
  let terminalHistory = $state<HistoryItem[]>([
    { type: 'output', text: 'EngBbq Mobile Radar v2.4' },
    { type: 'output', text: 'Tap command buttons below or enter query.' }
  ]);

  function executeCommand(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    triggerHaptic('lightTap');
    terminalHistory.push({ type: 'input', text: `➜ ${trimmed}` });
    const lower = trimmed.toLowerCase();

    switch (lower) {
      case 'status':
        terminalHistory.push({ type: 'output', text: '[OK] Host: engbbq.me (Edge CDN)\n[OK] Latency: 9.8ms\n[OK] Mobile Thumb Zone: Active' });
        break;
      case 'engbbq':
        terminalHistory.push({ type: 'output', text: 'EngBbq 4 Pillars Model: Effort Paradox, Avoidance, Fear of Judgment, Identity Crisis.' });
        break;
      case 'tianji':
        terminalHistory.push({ type: 'output', text: 'Tianji AI v4.0: 8.77M vector interpretations active.' });
        break;
      case 'whoami':
        terminalHistory.push({ type: 'output', text: 'Zera — Principal Solutions Architect' });
        break;
      case 'clear':
        terminalHistory = [];
        break;
      default:
        terminalHistory.push({ type: 'error', text: `Unknown: "${trimmed}". Tap quick commands.` });
        break;
    }
    terminalInput = '';
  }

  const levelOptions = [
    { value: 'b1', label: 'B1 // INTERMEDIATE REFLEX', badge: '1,200 WORDS' },
    { value: 'b2', label: 'B2 // ADVANCED FLUENCY', badge: '3,400 WORDS' },
    { value: 'c1', label: 'C1 // COGNITIVE MASTERY', badge: '6,800 WORDS' },
  ];

  const zodiacOptionsMobile = [
    { value: 'ziwei', label: 'TỬ VI ĐẾ TINH // CUNG TÝ', badge: 'ĐẾ VƯƠNG' },
    { value: 'tianfu', label: 'THIÊN PHỦ KIM TINH // CUNG MÙI', badge: 'KHO TÀNG' },
    { value: 'qisha', label: 'THẤT SÁT TRIỀU ĐẨU // CUNG NGỌ', badge: 'TƯỚNG QUÂN' },
    { value: 'tanlang', label: 'THAM LANG ĐỒNG ĐỘ // CUNG DẦN', badge: 'PHÚC THỌ' },
  ];

  const mobileAccordionItems = [
    {
      id: 'rule-1',
      title: 'QUY TẮC THUMB ZONE 48PX',
      badge: 'ERGONOMICS',
      content: 'Mọi nút bấm và tab điều hướng đáy đều có chiều cao tối thiểu 48px, đảm bảo ngón cái chạm chính xác 100% không bị lệch.'
    },
    {
      id: 'rule-2',
      title: 'TỰ ĐỘNG CHUYỂN BOTTOM SHEET',
      badge: 'DRAWER',
      content: 'Hộp thoại và bộ chọn Select tự động biến hình thành ngăn kéo đáy (Bottom Drawer), trượt từ dưới lên kèm thanh kéo drag-handle.'
    },
    {
      id: 'rule-3',
      title: 'HAPTIC VIBRATION FEEDBACK',
      badge: 'TACTILE',
      content: 'Tích hợp Web Vibration API tạo ra nhịp rung cơ học 10ms - 25ms khi bấm nút, tái hiện cảm giác bấm công tắc điện thoại thật.'
    }
  ];

  function handleTabSelect(tab: typeof activeTab) {
    activeTab = tab;
    triggerHaptic('mediumClick');
  }
</script>

<div class="block lg:hidden min-h-screen bg-brutal-dots transition-colors duration-150 text-black dark:text-white">

  <!-- Mobile Minimal Top Header (Standard Web Header) -->
  <header class="px-4 py-3 flex justify-between items-center border-b-[3px] border-black dark:border-white bg-[#FFE600] text-black">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-black text-white flex items-center justify-center font-mono font-black text-base border-2 border-black">
        CH
      </div>
      <span class="font-sans font-black text-xl tracking-tight uppercase">ENG.BBQ</span>
    </div>
    
    <div class="flex items-center gap-2">
      <button
        onclick={ontoggleTheme}
        class="px-2.5 py-1.5 font-mono text-[10px] font-black uppercase bg-white dark:bg-[#141414] text-black dark:text-white border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFF] cursor-pointer"
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <button
        onclick={() => { triggerHaptic('lightTap'); isDrawerOpen = true; }}
        class="px-3 py-1.5 font-mono text-xs font-black uppercase bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFF] cursor-pointer"
      >
        MENU ☰
      </button>
    </div>
  </header>

  <!-- Mobile Web Top Navigation Tabs (Standard Web Navigation, No Bottom Collisions) -->
  <div class="px-4 pt-3 pb-1 border-b-[2px] border-black dark:border-white bg-white dark:bg-[#141414]">
    <Tabs items={mobileNavTabs} bind:activeId={activeTab} />
  </div>

  <!-- Mobile Scrollable Main Content -->
  <main class="p-4 space-y-4">
    <!-- Hero Statement Mobile -->
    <div class="pt-2">
      <div class="flex gap-2 mb-2">
        <Badge variant="lime" rotate="left">DAILY ARENA</Badge>
        <Badge variant="cyan">STREAK #{streakDays}</Badge>
      </div>

      <h2 class="font-sans font-black text-3xl uppercase leading-[1.02] tracking-tight mb-2">
        LEARN FAST.<br>
        <span class="bg-[#FFE600] text-black px-1.5 border-[2px] border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFF] inline-block">
          TAP HARD.
        </span>
      </h2>

      <p class="font-sans text-xs text-neutral-600 dark:text-neutral-400 font-semibold leading-relaxed">
        Quy trình học ngoại ngữ nhận thức kết hợp máy trạng thái Ark UI và rung phản hồi cơ học trên từng cú chạm.
      </p>
    </div>

    <!-- Active Tab Presentation on Mobile -->
    {#if activeTab === 'arena'}
      <!-- Card 1: Today's Streak -->
      <Card title="ĐẤU TRƯỜNG HÔM NAY" badge="HOT" badgeColor="magenta">
        <div class="flex items-baseline justify-between mb-3">
          <span class="font-sans font-black text-4xl leading-none text-[#FF007A]">{streakDays} NGÀY</span>
          <span class="font-mono text-xs font-bold text-neutral-500 uppercase">+340 Vectors</span>
        </div>
        <p class="text-xs text-neutral-600 dark:text-neutral-300 mb-4 leading-relaxed">
          Đã hoàn thành 8/10 thử thách phản xạ ngữ cảnh. Còn 2 thử thách để mở khóa rương từ vựng tuần!
        </p>
        <Loader progress={80} label="TIẾN ĐỘ HÔM NAY" variant="magenta" />

        <div class="mt-4 space-y-2">
          <Button variant="primary" size="md" fullWidthOnMobile onclick={() => isDrawerOpen = true}>
            BẮT ĐẦU PHIÊN LUYỆN TẬP &rarr;
          </Button>
          <Button variant="secondary" size="md" fullWidthOnMobile onclick={() => isToastVisible = true}>
            BẬT THÔNG BÁO TOAST THỬ NGHIỆM
          </Button>
        </div>
      </Card>

      <!-- Component: Mobile Bottom Sheet Picker -->
      <div class="bg-white dark:bg-[#141414] border-[3px] border-black dark:border-white p-3.5 shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFF]">
        <SelectPicker 
          label="CHỌN TRÌNH ĐỘ HỌC TẬP" 
          options={levelOptions} 
          bind:value={selectedLevel} 
        />
        <div class="mt-3 pt-3 border-t-2 border-neutral-200 dark:border-neutral-800">
          <Switch 
            bind:checked={hapticEnabled} 
            label="KÍCH HOẠT RUNG HAPTIC FEEDBACK" 
          />
        </div>
      </div>

      <!-- Component: Mobile Accordion -->
      <Accordion items={mobileAccordionItems} />

    {:else if activeTab === 'words'}
      <Card title="KHO TỪ VỰNG NHẬN THỨC" badge="WORDS" badgeColor="yellow">
        <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-3">
          1,450 cụm từ ngữ cảnh được phân bổ theo thuật toán lặp lại ngắt quãng (Spaced Repetition).
        </p>
        <div class="space-y-3 mb-4">
          <div class="p-3 bg-neutral-100 dark:bg-[#1C1C1C] border-2 border-black dark:border-white font-mono text-xs">
            <div class="font-bold text-[#FF007A]">THE EFFORT PARADOX</div>
            <div class="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1">Càng cố học vẹt, càng nhanh quên trong phản xạ giao tiếp.</div>
          </div>
          <div class="p-3 bg-neutral-100 dark:bg-[#1C1C1C] border-2 border-black dark:border-white font-mono text-xs">
            <div class="font-bold text-[#00F0FF]">COGNITIVE AVOIDANCE</div>
            <div class="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1">Ép não bộ vượt qua tâm lý né tránh câu phức tạp dưới 3s.</div>
          </div>
        </div>
        <Button variant="secondary" size="md" fullWidthOnMobile>
          ÔN TẬP TỪ KHÓ NGAY
        </Button>
      </Card>

    {:else if activeTab === 'tianji'}
      <Card title="TIANJI ZIWEI AI COMPASS" badge="V4.0" badgeColor="cyan">
        <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-3">
          Tra cứu 8.77 triệu quẻ mệnh và đồ hình kinh mạch lưu chú theo khẩu quyết Thiên Kỷ Nghê Hải Hà.
        </p>
        <div class="mb-4">
          <SelectPicker 
            label="CHỌN TINH BÀN MỆNH VỊ" 
            options={zodiacOptionsMobile} 
            bind:value={selectedZodiacMobile} 
          />
        </div>
        <div class="p-3 bg-[#FFFDF0] dark:bg-[#1C1C1C] border-2 border-black dark:border-white font-mono text-xs mb-4 text-black dark:text-white">
          QUY CÁCH: THƯỢNG CÁCH &bull; 8.77M VECTOR CORPUS MATCHED
        </div>
        <Button variant="primary" size="md" fullWidthOnMobile>
          TRA CỨU LÁ SỐ MOBILE
        </Button>
      </Card>

    {:else if activeTab === 'cli'}
      <!-- Mobile CLI Terminal Tab -->
      <div class="border-[3px] border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFF] bg-black text-white p-4 font-mono text-xs">
        <div class="flex items-center justify-between pb-2 mb-3 border-b border-neutral-700 text-[#FFE600] font-black">
          <span>MOBILE CLI RADAR</span>
          <span>ONLINE</span>
        </div>

        <!-- Terminal Buffer -->
        <div class="h-44 overflow-y-auto space-y-1 text-[11px] mb-3 pr-1">
          {#each terminalHistory as item}
            <div class="{item.type === 'input' ? 'text-[#00FF66]' : item.type === 'error' ? 'text-[#FF007A]' : 'text-neutral-300'} whitespace-pre-line leading-relaxed">
              {item.text}
            </div>
          {/each}
        </div>

        <!-- Command Buttons Pills on Mobile for Fast Tap -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          <button onclick={() => executeCommand('status')} class="p-2 bg-neutral-800 text-white border border-neutral-600 text-xs font-bold uppercase active:bg-[#FFE600] active:text-black cursor-pointer">
            STATUS
          </button>
          <button onclick={() => executeCommand('engbbq')} class="p-2 bg-neutral-800 text-white border border-neutral-600 text-xs font-bold uppercase active:bg-[#00F0FF] active:text-black cursor-pointer">
            ENGBBQ
          </button>
          <button onclick={() => executeCommand('tianji')} class="p-2 bg-neutral-800 text-white border border-neutral-600 text-xs font-bold uppercase active:bg-[#00FF66] active:text-black cursor-pointer">
            TIANJI
          </button>
          <button onclick={() => executeCommand('clear')} class="p-2 bg-neutral-800 text-white border border-neutral-600 text-xs font-bold uppercase active:bg-[#FF007A] active:text-black cursor-pointer">
            CLEAR
          </button>
        </div>

        <!-- Command Line Input -->
        <form onsubmit={(e) => { e.preventDefault(); executeCommand(terminalInput); }} class="flex gap-2">
          <span class="text-[#00FF66] font-bold">➜</span>
          <input
            type="text"
            bind:value={terminalInput}
            placeholder="or type command here..."
            class="flex-1 bg-transparent text-white outline-none border-b border-neutral-700 pb-0.5 text-xs font-mono"
          />
        </form>
      </div>

    {:else}
      <Card title="HỒ SƠ HỌC VIÊN" badge="USER" badgeColor="lime">
        <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-3">
          Cấp bậc: <strong>Senior Cognitive Engineer</strong> &bull; Chuỗi liên tục: 24 ngày.
        </p>
        <div class="space-y-2 mb-4 font-mono text-xs">
          <div class="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1">
            <span>PLATFORM:</span>
            <span class="font-bold">engbbq.me</span>
          </div>
          <div class="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1">
            <span>ENGINE:</span>
            <span class="font-bold">Go + Svelte 5</span>
          </div>
        </div>
        <Button variant="outline" size="md" fullWidthOnMobile>
          CÀI ĐẶT TÀI KHOẢN
        </Button>
      </Card>
    {/if}

    <!-- Callout Box -->
    <div class="border-[3px] border-black dark:border-white p-4 bg-[#FFE600] text-black shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFF]">
      <div class="font-mono text-xs font-black uppercase">💡 WEB-FIRST MOBILE ARCHITECTURE:</div>
      <div class="text-xs font-semibold mt-1 leading-relaxed">
        Giao diện thuần Web 100%: Không ngụy tạo App, không Bottom Toolbar che khuất Safari/Chrome. Điều hướng qua Web Tabs đỉnh trang và Menu Drawer!
      </div>
    </div>

    <!-- Web-Native Mobile Footer -->
    <footer class="mt-8 p-4 border-[3px] border-black dark:border-white bg-black text-white font-mono text-xs space-y-1">
      <div class="flex justify-between items-center text-[#FFE600] font-bold">
        <span>ENGBBQ.ME &bull; MOBILE WEB</span>
        <span>ISO-2026.04</span>
      </div>
      <div class="text-[10px] text-neutral-400">
        Standard Web Architecture &bull; No PWA &bull; Pure Svelte 5 Runes
      </div>
    </footer>
  </main>

  <!-- Mobile Ark UI Drawer (Bottom Sheet) -->
  <DialogDrawer bind:open={isDrawerOpen} title="MOBILE SYSTEM MENU">
    <div class="space-y-4">
      <p class="font-sans text-sm leading-relaxed">
        Trên Mobile, hộp thoại <strong>tự động chuyển hóa thành Bottom Sheet Drawer</strong> trượt từ dưới đáy lên theo máy trạng thái Ark UI Zag.js.
      </p>
      
      <!-- Quick Navigation inside Drawer -->
      <div class="pt-2">
        <div class="font-mono text-[10px] font-bold uppercase text-neutral-500 mb-2">ĐIỀU HƯỚNG CÁC PHÂN HỆ:</div>
        <div class="grid grid-cols-1 gap-1.5">
          {#each mobileNavTabs as tab}
            <button
              onclick={() => { activeTab = tab.id; isDrawerOpen = false; }}
              class="p-2.5 text-left font-mono text-xs font-bold uppercase border-2 border-black dark:border-white flex justify-between items-center transition-colors cursor-pointer {activeTab === tab.id ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFF]' : 'bg-white dark:bg-[#141414] text-black dark:text-white'}"
            >
              <span>{tab.label}</span>
              <span class="text-[9px] px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black">{tab.badge}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="p-3 bg-[#FFFDF0] dark:bg-[#1C1C1C] border-2 border-black dark:border-white font-mono text-xs text-black dark:text-white">
        STATUS: Ark UI Zag State Machine &bull; Touch Drag Gesture Enabled
      </div>

      <div class="space-y-2 pt-2">
        <Button variant="primary" fullWidthOnMobile onclick={() => isDrawerOpen = false}>
          ĐÓNG MENU HỆ THỐNG
        </Button>
      </div>
    </div>
  </DialogDrawer>

  <!-- Mobile Toast Alert (Nổi phía dưới góc an toàn) -->
  <Toast 
    bind:visible={isToastVisible} 
    title="MOBILE WEB TOAST" 
    message="Thông báo nổi nhẹ nhàng phía dưới màn hình, tự động biến mất sau 4 giây."
    type="warning"
  />
</div>

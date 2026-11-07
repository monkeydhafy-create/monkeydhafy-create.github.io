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

  <!-- Mobile Minimal Top Header (Standard Web Header with Nocturnal Dark Mode) -->
  <header class="px-4 py-3 flex justify-between items-center border-b-[3px] border-black dark:border-white bg-[#FFE600] dark:bg-[#09090B] text-black dark:text-white transition-colors duration-150">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-black text-white dark:bg-[#1C1900] dark:text-[#FFE600] flex items-center justify-center font-mono font-black text-base border-2 border-black dark:border-white shadow-[1.5px_1.5px_0px_#000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF]">
        CH
      </div>
      <span class="font-sans font-black text-xl tracking-tight uppercase text-black dark:text-white">ENG.BBQ</span>
    </div>
    
    <div class="flex items-center gap-2">
      <button
        onclick={ontoggleTheme}
        class="px-2.5 py-1.5 font-mono text-[10px] font-black uppercase bg-white dark:bg-[#18181B] text-black dark:text-[#FFE600] border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <button
        onclick={() => { triggerHaptic('lightTap'); isDrawerOpen = true; }}
        class="px-3 py-1.5 font-mono text-xs font-black uppercase bg-black text-white dark:bg-[#1C1900] dark:text-[#FFE600] border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
      >
        MENU ☰
      </button>
    </div>
  </header>

  <!-- Mobile Fit-on-Screen Feature Bento Navigation (RULE 16: ZERO HORIZONTAL SCROLL) -->
  <div class="px-4 py-3 border-b-[2px] border-black dark:border-zinc-800 bg-white/95 dark:bg-[#0E0E10]/95 backdrop-blur-sm select-none">
    <div class="grid grid-cols-2 gap-2 mb-2">
      <button
        type="button"
        onclick={() => handleTabSelect('arena')}
        class="p-2.5 flex items-center justify-between border-[2px] border-black dark:border-white font-mono text-xs font-black uppercase transition-all duration-75 cursor-pointer select-none
               {activeTab === 'arena' 
                 ? 'bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] -translate-y-0.5' 
                 : 'bg-neutral-100 dark:bg-[#18181B] text-black dark:text-zinc-300 hover:bg-[#FFE600] hover:text-black dark:hover:bg-[#1C1900] dark:hover:text-[#FFE600] shadow-[1.5px_1.5px_0px_#000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF]'}"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-sm">⚡</span>
          <span>ARENA</span>
        </div>
        <span class="text-[9px] px-1.5 py-0.5 {activeTab === 'arena' ? 'bg-black text-white dark:bg-[#FFE600] dark:text-black' : 'bg-black text-white dark:bg-zinc-800 dark:text-zinc-300'} font-bold">DAILY</span>
      </button>

      <button
        type="button"
        onclick={() => handleTabSelect('words')}
        class="p-2.5 flex items-center justify-between border-[2px] border-black dark:border-white font-mono text-xs font-black uppercase transition-all duration-75 cursor-pointer select-none
               {activeTab === 'words' 
                 ? 'bg-[#00F0FF] text-black dark:bg-[#031C20] dark:text-[#00F0FF] dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] -translate-y-0.5' 
                 : 'bg-neutral-100 dark:bg-[#18181B] text-black dark:text-zinc-300 hover:bg-[#00F0FF] hover:text-black dark:hover:bg-[#031C20] dark:hover:text-[#00F0FF] shadow-[1.5px_1.5px_0px_#000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF]'}"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-sm">📖</span>
          <span>WORDS</span>
        </div>
        <span class="text-[9px] px-1.5 py-0.5 {activeTab === 'words' ? 'bg-black text-white dark:bg-[#00F0FF] dark:text-black' : 'bg-black text-white dark:bg-zinc-800 dark:text-zinc-300'} font-bold">1.4K</span>
      </button>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        type="button"
        onclick={() => handleTabSelect('tianji')}
        class="p-2 flex flex-col items-center justify-center border-[2px] border-black dark:border-white font-mono text-xs font-black uppercase transition-all duration-75 cursor-pointer select-none
               {activeTab === 'tianji' 
                 ? 'bg-[#00FF7F] text-black dark:bg-[#04200E] dark:text-[#00FF7F] dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] -translate-y-0.5' 
                 : 'bg-neutral-100 dark:bg-[#18181B] text-black dark:text-zinc-300 hover:bg-[#00FF7F] hover:text-black dark:hover:bg-[#04200E] dark:hover:text-[#00FF7F] shadow-[1.5px_1.5px_0px_#000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF]'}"
      >
        <div class="flex items-center gap-1">
          <span class="text-xs">🔮</span>
          <span>TIANJI</span>
        </div>
        <span class="text-[8px] opacity-75 mt-0.5 font-bold">8.77M</span>
      </button>

      <button
        type="button"
        onclick={() => handleTabSelect('cli')}
        class="p-2 flex flex-col items-center justify-center border-[2px] border-black dark:border-white font-mono text-xs font-black uppercase transition-all duration-75 cursor-pointer select-none
               {activeTab === 'cli' 
                 ? 'bg-[#FF007A] text-white dark:bg-[#200412] dark:text-[#FF1A8C] dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] -translate-y-0.5' 
                 : 'bg-neutral-100 dark:bg-[#18181B] text-black dark:text-zinc-300 hover:bg-[#FF007A] hover:text-white dark:hover:bg-[#200412] dark:hover:text-[#FF1A8C] shadow-[1.5px_1.5px_0px_#000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF]'}"
      >
        <div class="flex items-center gap-1">
          <span class="text-xs">💻</span>
          <span>CLI</span>
        </div>
        <span class="text-[8px] opacity-75 mt-0.5 font-bold">RADAR</span>
      </button>

      <button
        type="button"
        onclick={() => handleTabSelect('profile')}
        class="p-2 flex flex-col items-center justify-center border-[2px] border-black dark:border-white font-mono text-xs font-black uppercase transition-all duration-75 cursor-pointer select-none
               {activeTab === 'profile' 
                 ? 'bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] -translate-y-0.5' 
                 : 'bg-neutral-100 dark:bg-[#18181B] text-black dark:text-zinc-300 hover:bg-[#FFE600] hover:text-black dark:hover:bg-[#1C1900] dark:hover:text-[#FFE600] shadow-[1.5px_1.5px_0px_#000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF]'}"
      >
        <div class="flex items-center gap-1">
          <span class="text-xs">👤</span>
          <span>USER</span>
        </div>
        <span class="text-[8px] opacity-75 mt-0.5 font-bold">PROFILE</span>
      </button>
    </div>
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
        <span class="bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] px-1.5 border-[2px] border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF] inline-block">
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
      <div class="bg-white dark:bg-[#0E0E10] border-[3px] border-black dark:border-white p-3.5 shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF]">
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
          <div class="p-3 bg-neutral-100 dark:bg-[#18181B] border-2 border-black dark:border-white font-mono text-xs">
            <div class="font-bold text-[#FF007A]">THE EFFORT PARADOX</div>
            <div class="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1">Càng cố học vẹt, càng nhanh quên trong phản xạ giao tiếp.</div>
          </div>
          <div class="p-3 bg-neutral-100 dark:bg-[#18181B] border-2 border-black dark:border-white font-mono text-xs">
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
        <div class="p-3 bg-[#FFFDF0] dark:bg-[#18181B] border-2 border-black dark:border-white font-mono text-xs mb-4 text-black dark:text-white">
          QUY CÁCH: THƯỢNG CÁCH &bull; 8.77M VECTOR CORPUS MATCHED
        </div>
        <Button variant="primary" size="md" fullWidthOnMobile>
          TRA CỨU LÁ SỐ MOBILE
        </Button>
      </Card>

    {:else if activeTab === 'cli'}
      <!-- Mobile CLI Terminal Tab -->
      <div class="border-[3px] border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] bg-black text-white p-4 font-mono text-xs">
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
    <div class="border-[3px] border-black dark:border-white p-4 bg-[#FFE600] text-black dark:bg-[#141200] dark:text-zinc-100 shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#FFFFFF]">
      <div class="font-mono text-xs font-black uppercase text-black dark:text-[#FFE600]">💡 WEB-FIRST MOBILE ARCHITECTURE:</div>
      <div class="text-xs font-semibold mt-1 leading-relaxed">
        Giao diện thuần Web 100%: Không ngụy tạo App, không Bottom Toolbar che khuất Safari/Chrome. Điều hướng qua Bento Grid hiển thị trọn vẹn và Menu Drawer!
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
              class="p-2.5 text-left font-mono text-xs font-bold uppercase border-2 border-black dark:border-white flex justify-between items-center transition-colors cursor-pointer {activeTab === tab.id ? 'bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#FFFFFF]' : 'bg-white dark:bg-[#18181B] text-black dark:text-white'}"
            >
              <span>{tab.label}</span>
              <span class="text-[9px] px-1.5 py-0.5 {activeTab === tab.id ? 'bg-black text-white dark:bg-[#FFE600] dark:text-black' : 'bg-black text-white dark:bg-zinc-800 dark:text-zinc-300'} font-bold">{tab.badge}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="p-3 bg-[#FFFDF0] dark:bg-[#18181B] border-2 border-black dark:border-white font-mono text-xs text-black dark:text-white">
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

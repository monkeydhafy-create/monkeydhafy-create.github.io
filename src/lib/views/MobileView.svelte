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
  import { triggerHaptic } from '$lib/constants/tokens';

  interface Props {
    isDark?: boolean;
    ontoggleTheme?: () => void;
  }

  let { isDark = false, ontoggleTheme }: Props = $props();

  let activeTab = $state<'arena' | 'words' | 'tianji' | 'cli' | 'profile'>('arena');
  let isDrawerOpen = $state(false);
  let isToastVisible = $state(false);
  let hapticEnabled = $state(true);
  let selectedLevel = $state('b2');
  let selectedZodiacMobile = $state('ziwei');
  let streakDays = $state(24);

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

<div class="block lg:hidden min-h-screen bg-brutal-dots transition-colors duration-150 pb-[84px] text-black dark:text-white">
  
  <!-- Mobile Status Bar (Simulated Phone Notch Area) -->
  <div class="px-5 py-2.5 flex justify-between items-center font-mono text-[11px] font-black border-b-[3px] border-black dark:border-white bg-white dark:bg-neutral-900">
    <span>09:41</span>
    <div class="flex items-center gap-2">
      <span class="text-[#00FF66] font-bold">5G</span>
      <span>100% 🔋</span>
    </div>
  </div>

  <!-- Mobile Minimal Top Header -->
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
        class="px-2.5 py-1.5 font-mono text-[10px] font-black uppercase bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <button
        onclick={() => { triggerHaptic('lightTap'); isDrawerOpen = true; }}
        class="px-3 py-1.5 font-mono text-xs font-black uppercase bg-black text-white border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
      >
        MENU ☰
      </button>
    </div>
  </header>

  <!-- Mobile High-Speed Marquee -->
  <div class="bg-[#FF007A] text-white py-1.5 border-b-[3px] border-black dark:border-white overflow-hidden select-none font-mono text-[10px] font-black uppercase tracking-wider">
    <div class="animate-brutal-marquee gap-8">
      <span>★ MOBILE THUMB ZONE V2.4</span>
      <span>★ 48PX TOUCH TARGETS</span>
      <span>★ ARK UI BOTTOM DRAWER</span>
      <span>★ TACTILE HAPTIC VIBRATION</span>
      <!-- Loop -->
      <span>★ MOBILE THUMB ZONE V2.4</span>
      <span>★ 48PX TOUCH TARGETS</span>
      <span>★ ARK UI BOTTOM DRAWER</span>
      <span>★ TACTILE HAPTIC VIBRATION</span>
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
        <span class="bg-[#FFE600] text-black px-1.5 border-[2px] border-black shadow-[3px_3px_0px_#000] inline-block">
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
      <div class="bg-white dark:bg-neutral-900 border-[3px] border-black dark:border-white p-3.5 shadow-[3px_3px_0px_#000]">
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
          <div class="p-3 bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-white font-mono text-xs">
            <div class="font-bold text-[#FF007A]">THE EFFORT PARADOX</div>
            <div class="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1">Càng cố học vẹt, càng nhanh quên trong phản xạ giao tiếp.</div>
          </div>
          <div class="p-3 bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-white font-mono text-xs">
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
        <div class="p-3 bg-[#FFFDF0] dark:bg-neutral-800 border-2 border-black dark:border-white font-mono text-xs mb-4">
          QUY CÁCH: THƯỢNG CÁCH &bull; 8.77M VECTOR CORPUS MATCHED
        </div>
        <Button variant="primary" size="md" fullWidthOnMobile>
          TRA CỨU LÁ SỐ MOBILE
        </Button>
      </Card>

    {:else if activeTab === 'cli'}
      <!-- Mobile CLI Terminal Tab -->
      <div class="border-[3px] border-black dark:border-white shadow-[4px_4px_0px_#000] bg-black text-white p-4 font-mono text-xs">
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
          <button onclick={() => executeCommand('status')} class="p-2 bg-neutral-800 text-white border border-neutral-600 text-xs font-bold uppercase active:bg-[#FFE600] active:text-black">
            STATUS
          </button>
          <button onclick={() => executeCommand('engbbq')} class="p-2 bg-neutral-800 text-white border border-neutral-600 text-xs font-bold uppercase active:bg-[#00F0FF] active:text-black">
            ENGBBQ
          </button>
          <button onclick={() => executeCommand('tianji')} class="p-2 bg-neutral-800 text-white border border-neutral-600 text-xs font-bold uppercase active:bg-[#00FF66] active:text-black">
            TIANJI
          </button>
          <button onclick={() => executeCommand('clear')} class="p-2 bg-neutral-800 text-white border border-neutral-600 text-xs font-bold uppercase active:bg-[#FF007A] active:text-black">
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
          <div class="flex justify-between border-b pb-1">
            <span>PLATFORM:</span>
            <span class="font-bold">engbbq.me</span>
          </div>
          <div class="flex justify-between border-b pb-1">
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
    <div class="border-[3px] border-black dark:border-white p-4 bg-[#FFE600] text-black shadow-[3px_3px_0px_#000]">
      <div class="font-mono text-xs font-black uppercase">💡 MOBILE BEHAVIOR VERIFIED:</div>
      <div class="text-xs font-semibold mt-1 leading-relaxed">
        Select chuyển thành Bottom Sheet, Toast nổi trên Bottom Dock, và phản hồi rung khi bấm nút!
      </div>
    </div>
  </main>

  <!-- Mobile Fixed Bottom Thumb Dock Navigation (Height: 72px) -->
  <nav class="fixed bottom-0 left-0 right-0 h-[72px] bg-white dark:bg-neutral-900 border-t-[3px] border-black dark:border-white px-2 pb-[env(safe-area-inset-bottom,8px)] grid grid-cols-5 items-center gap-1 z-50 shadow-[0px_-3px_0px_#000]">
    {#each [
      { id: 'arena', label: 'ARENA', icon: '⚡' },
      { id: 'words', label: 'WORDS', icon: '📖' },
      { id: 'tianji', label: 'TIANJI', icon: '🔮' },
      { id: 'cli', label: 'CLI', icon: '💻' },
      { id: 'profile', label: 'USER', icon: '👤' }
    ] as const as item}
      {@const isActive = activeTab === item.id}
      <button
        onclick={() => handleTabSelect(item.id)}
        class="flex flex-col items-center justify-center h-12 rounded transition-transform duration-75 cursor-pointer select-none
               {isActive ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_#000] -translate-y-0.5' : 'text-neutral-500 dark:text-neutral-400'}"
      >
        <span class="text-base leading-none mb-0.5">{item.icon}</span>
        <span class="font-mono text-[8px] font-black uppercase tracking-wider">{item.label}</span>
      </button>
    {/each}
  </nav>

  <!-- Mobile Ark UI Drawer (Bottom Sheet) -->
  <DialogDrawer bind:open={isDrawerOpen} title="MOBILE BOTTOM DRAWER">
    <div class="space-y-4">
      <p class="font-sans text-sm leading-relaxed">
        Trên Mobile ($W \le 430px$), hộp thoại <strong>tự động chuyển hóa thành Bottom Sheet Drawer</strong> trượt từ dưới đáy lên với thanh kéo tay cầm (Drag Handle) và nút bấm chuẩn cảm ứng 48px!
      </p>
      
      <div class="p-3 bg-[#FFFDF0] dark:bg-neutral-800 border-2 border-black dark:border-white font-mono text-xs">
        STATUS: Ark UI Zag State Machine &bull; Touch Drag Gesture Enabled
      </div>

      <div class="space-y-2 pt-2">
        <Button variant="primary" fullWidthOnMobile onclick={() => isDrawerOpen = false}>
          XÁC NHẬN & TIẾP TỤC &rarr;
        </Button>
        <Button variant="outline" fullWidthOnMobile onclick={() => isDrawerOpen = false}>
          ĐÓNG NGĂN KÉO
        </Button>
      </div>
    </div>
  </DialogDrawer>

  <!-- Mobile Toast Alert (Nổi trên Bottom Dock 84px) -->
  <Toast 
    bind:visible={isToastVisible} 
    title="MOBILE HAPTIC TOAST" 
    message="Nổi phía trên thanh Bottom Dock, tự động biến mất sau 4 giây."
    type="warning"
  />
</div>

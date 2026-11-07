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
  import { DESIGN_SYSTEM_RULES } from '$lib/constants/rules';
  import { triggerHaptic } from '$lib/constants/tokens';

  interface Props {
    isDark?: boolean;
    ontoggleTheme?: () => void;
    onnavigate?: (route: 'portfolio' | 'components') => void;
  }

  let { isDark = false, ontoggleTheme, onnavigate }: Props = $props();

  // Dialog & Toast States
  let isModalOpen = $state(false);
  let isToastVisible = $state(false);
  let toastType = $state<'success' | 'warning' | 'error' | 'info'>('success');
  let toastMsg = $state('Đã kích hoạt thông báo mẫu từ Component Lab.');

  // Form Controls State
  let sampleInputText = $state('Cognitive Reflex Engine');
  let sampleEmailText = $state('architect@engbbq.me');
  let sampleSelectValue = $state('svelte5');
  let switchAutoSync = $state(true);
  let switchHaptics = $state(true);
  let switchDeepOled = $state(true);

  // Tab Demo State
  let activeTabDemo = $state('buttons');
  let sampleLoaderProgress = $state(75);

  const sampleSelectOptions = [
    { value: 'svelte5', label: 'SVELTE 5 RUNES ENGINE', badge: 'FASTEST' },
    { value: 'go', label: 'GO DISTRIBUTED WORKFLOW', badge: '1.2M RPS' },
    { value: 'arkui', label: 'ARK UI STATE MACHINE (ZAG)', badge: 'FSM' },
    { value: 'tianji', label: 'TIANJI VECTOR CORPUS V4.0', badge: '8.77M' },
  ];

  const demoTabs = [
    { id: 'buttons', label: '01 / BUTTONS', badge: 'TACTILE' },
    { id: 'forms', label: '02 / FORMS & INPUTS', badge: 'CONTROLS' },
    { id: 'layout', label: '03 / CARDS & ACCORDION', badge: 'SURFACES' },
    { id: 'feedback', label: '04 / LOADERS & TOAST', badge: 'DYNAMIC' },
    { id: 'rules', label: '05 / 16 IRON RULES', badge: 'STANDARD' },
  ];

  const demoAccordionItems = [
    {
      id: 'acc-1',
      title: 'MÁY TRẠNG THÁI HỮU HẠN ARK UI (ZAG.JS ENGINE)',
      badge: 'FSM',
      content: 'Mọi linh kiện có trạng thái phức tạp (Accordion, Dialog, Popover, Switch) đều được vận hành bởi máy trạng thái hữu hạn, tuân thủ 100% chuẩn WAI-ARIA, phím bấm Tab, Esc, Arrow Keys mượt mà và triệt tiêu race-condition.'
    },
    {
      id: 'acc-2',
      title: 'BÓNG ĐỔ CỨNG 90 ĐỘ ZERO-BLUR & PHẢN HỒI XÚC GIÁC',
      badge: 'TACTILE',
      content: 'Loại bỏ hoàn toàn bóng mờ khuếch tán. Mọi bóng đổ góc 90 độ với bán kính mờ r = 0px. Khi phần tử được bấm (:active), tọa độ X và Y thụt xuống 4px và bóng đổ triệt tiêu về 0px, tái hiện xúc giác phím cơ Arcade.'
    },
    {
      id: 'acc-3',
      title: 'KIẾN TRÚC DEEP OLED MULTI-TIER DARK MODE',
      badge: 'OLED',
      content: 'Chuyển đổi đa tầng: Nền Canvas #000000, Card Surface #0E0E10, Sub-surface #18181B. Viền mực sáng Zinc-300 và bóng đổ Cyber Neon tương phản cao, triệt tiêu hoàn toàn lỗi dính viền trắng dày cộm.'
    }
  ];

  function showToast(type: 'success' | 'warning' | 'error' | 'info', msg: string) {
    triggerHaptic('mediumClick');
    toastType = type;
    toastMsg = msg;
    isToastVisible = true;
  }
</script>

<div class="min-h-screen bg-brutal-dots transition-colors duration-150 p-4 sm:p-6 md:p-8 lg:p-12 text-black dark:text-white">
  <!-- Masthead Container (Desktop 1240px Matrix / Mobile Fit-On-Screen) -->
  <div class="max-w-[1240px] mx-auto bg-white dark:bg-[#0E0E10] border-[3px] md:border-[4px] border-black dark:border-white shadow-[8px_8px_0px_#000] md:shadow-[16px_16px_0px_#000] dark:shadow-[8px_8px_0px_#FFFFFF] md:dark:shadow-[16px_16px_0px_#FFFFFF] overflow-hidden">
    
    <!-- Top Global Header -->
    <header class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b-[3px] md:border-b-[4px] border-black dark:border-white bg-white dark:bg-[#09090B] transition-colors duration-150">
      
      <!-- Brand & Title -->
      <div class="flex items-center">
        <div class="w-14 sm:w-16 h-14 sm:h-16 bg-[#00F0FF] text-black dark:bg-[#031C20] dark:text-[#00F0FF] flex items-center justify-center font-mono font-black text-xl sm:text-2xl border-r-[3px] md:border-r-[4px] border-black dark:border-white shrink-0">
          UI
        </div>
        <div class="px-4 py-2">
          <div class="flex items-center gap-2">
            <span class="font-sans font-black text-xl sm:text-2xl tracking-tight uppercase text-black dark:text-white leading-none">
              COMPONENT LAB
            </span>
            <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-[#00FF66] text-black dark:bg-[#04200E] dark:text-[#00FF7F] border border-black dark:border-white">
              LIVE DEMO
            </span>
          </div>
          <p class="font-mono text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
            HYPER NEO-BRUTALISM &bull; ARK UI SUITE &bull; ISO-2026.04
          </p>
        </div>
      </div>

      <!-- Action Navigation Hub -->
      <div class="flex items-center justify-between sm:justify-end border-t-[3px] sm:border-t-0 border-black dark:border-white p-2.5 sm:p-3 gap-2 bg-neutral-100 dark:bg-[#18181B]">
        <!-- Page Switcher: Portfolio vs Components Demo -->
        <div class="inline-flex border-2 border-black dark:border-white bg-white dark:bg-[#0E0E10] p-1 gap-1">
          <button
            type="button"
            onclick={() => { triggerHaptic('mediumClick'); onnavigate?.('portfolio'); }}
            class="px-3 py-1 font-mono text-xs font-bold uppercase text-neutral-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            &larr; 👤 HỒ SƠ
          </button>
          <button
            type="button"
            class="px-3 py-1 font-mono text-xs font-black uppercase bg-[#00F0FF] text-black dark:bg-[#031C20] dark:text-[#00F0FF] border border-black dark:border-white shadow-[1.5px_1.5px_0px_#000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF] cursor-pointer"
          >
            🧩 COMPONENT LAB
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

    <!-- Lab Sub-Header Banner -->
    <section class="p-6 sm:p-8 border-b-[3px] md:border-b-[4px] border-black dark:border-white bg-white dark:bg-[#0E0E10]">
      <div class="max-w-4xl">
        <div class="flex flex-wrap gap-2 mb-3">
          <Badge variant="cyan" rotate="left">SHOWROOM TRƯNG BÀY TOÀN BỘ LINH KIỆN</Badge>
          <Badge variant="yellow">100% SVELTE 5 RUNES</Badge>
          <Badge variant="lime">DEEP OLED COMPLIANT</Badge>
        </div>

        <h1 class="font-sans font-black text-3xl sm:text-5xl uppercase tracking-tight text-black dark:text-white leading-[1.02] mb-3">
          PHÒNG THỬ NGHIỆM COMPONENT &bull; ALL INTERACTIVE
        </h1>

        <p class="font-sans text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-2xl">
          Nơi kiểm nghiệm trực tiếp toàn bộ hành vi, phản hồi xúc giác cơ học, chuyển đổi Dark/Light mode và độ tương phản của từng linh kiện trong hệ sinh thái <strong>Hyper Neo-Brutalism × Ark UI</strong>.
        </p>

        <!-- Segmented Category Tabs -->
        <div class="mt-6">
          <Tabs items={demoTabs} bind:activeId={activeTabDemo} />
        </div>
      </div>
    </section>

    <!-- Dynamic Category Showcase Body -->
    <div class="p-6 sm:p-8 md:p-12 space-y-12">
      
      <!-- ================================================================= -->
      <!-- 01. BUTTONS & STICKERS -->
      <!-- ================================================================= -->
      {#if activeTabDemo === 'buttons'}
        <div class="space-y-8">
          <div>
            <div class="font-mono text-xs font-black uppercase text-[#FFE600] tracking-wider mb-1">
              ■ COMPONENT MATRIX 01
            </div>
            <h2 class="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white">
              NÚT BẤM CƠ HỌC (TACTILE BUTTONS) & HUY HIỆU (BADGES)
            </h2>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Kiểm nghiệm phản hồi thụt lề 4px (:active) và triệt tiêu bóng offset tức thời (&lt; 100ms).
            </p>
          </div>

          <!-- Buttons Row Variants -->
          <Card title="CÁC BIẾN THỂ NÚT BẤM CHÍNH (BUTTON VARIANTS)" badge="TACTILE" badgeColor="yellow">
            <div class="space-y-6">
              
              <!-- Standard Variants -->
              <div>
                <div class="font-mono text-xs font-bold text-neutral-500 uppercase mb-3">MÀU SẮC BIẾN THỂ (VARIANTS):</div>
                <div class="flex flex-wrap items-center gap-3">
                  <Button variant="primary" onclick={() => showToast('success', 'Bấm nút Primary thành công!')}>
                    PRIMARY BTN &rarr;
                  </Button>
                  <Button variant="secondary" onclick={() => showToast('info', 'Bấm nút Secondary (Electric Cyan)!')}>
                    SECONDARY BTN
                  </Button>
                  <Button variant="outline" onclick={() => showToast('warning', 'Bấm nút Outline!')}>
                    OUTLINE BTN
                  </Button>
                  <Button variant="danger" onclick={() => showToast('error', 'Cảnh báo nguy hiểm từ Danger Button!')}>
                    DANGER BTN
                  </Button>
                </div>
              </div>

              <!-- Sizes -->
              <div class="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div class="font-mono text-xs font-bold text-neutral-500 uppercase mb-3">KÍCH THƯỚC (SIZES):</div>
                <div class="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="sm">SIZE NHỎ (SM)</Button>
                  <Button variant="primary" size="md">SIZE CHUẨN (MD)</Button>
                  <Button variant="primary" size="lg">SIZE LỚN (LG)</Button>
                </div>
              </div>

              <!-- States: Loading & Disabled -->
              <div class="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div class="font-mono text-xs font-bold text-neutral-500 uppercase mb-3">TRẠNG THÁI (STATES):</div>
                <div class="flex flex-wrap items-center gap-3">
                  <Button variant="primary" loading>ĐANG TẢI DỮ LIỆU...</Button>
                  <Button variant="secondary" disabled>VÔ HIỆU HÓA (DISABLED)</Button>
                  <Button variant="outline" fullWidthOnMobile>FULL WIDTH TRÊN MOBILE</Button>
                </div>
              </div>

            </div>
          </Card>

          <!-- Badges & Stickers Matrix -->
          <Card title="HỆ THỐNG HUY HIỆU & STICKER NGHIÊNG (BADGES & STICKERS)" badge="ZINE CULTURE" badgeColor="magenta">
            <div class="space-y-4">
              <div class="font-mono text-xs font-bold text-neutral-500 uppercase mb-2">BẢNG MÀU POP ART SIÊU BÃO HÒA:</div>
              
              <div class="flex flex-wrap gap-3 items-center">
                <Badge variant="yellow">ACID YELLOW</Badge>
                <Badge variant="cyan">ELECTRIC CYAN</Badge>
                <Badge variant="magenta">HOT MAGENTA</Badge>
                <Badge variant="lime">CYBER LIME</Badge>
                <Badge variant="purple">DEEP PURPLE</Badge>
                <Badge variant="orange">FLAME ORANGE</Badge>
                <Badge variant="neutral">NEUTRAL ZINC</Badge>
              </div>

              <div class="font-mono text-xs font-bold text-neutral-500 uppercase pt-4 border-t border-neutral-200 dark:border-neutral-800">
                STICKER NGHIÊNG TỰ DO (-2° ĐẾN +3°):
              </div>
              <div class="flex flex-wrap gap-4 items-center pt-2">
                <Badge variant="yellow" rotate="left">ROTATED LEFT (-2°)</Badge>
                <Badge variant="magenta" rotate="right">ROTATED RIGHT (+2°)</Badge>
                <Badge variant="lime" rotate="left">VERIFIED 100%</Badge>
                <Badge variant="cyan" rotate="right">ARK UI STATE</Badge>
              </div>
            </div>
          </Card>
        </div>

      <!-- ================================================================= -->
      <!-- 02. FORMS & INPUTS -->
      <!-- ================================================================= -->
      {:else if activeTabDemo === 'forms'}
        <div class="space-y-8">
          <div>
            <div class="font-mono text-xs font-black uppercase text-[#00F0FF] tracking-wider mb-1">
              ■ COMPONENT MATRIX 02
            </div>
            <h2 class="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white">
              Ô NHẬP LIỆU (INPUTS), BỘ CHỌN (SELECT) & CÔNG TẮC (SWITCH)
            </h2>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Khung viền mực 3px-4px, bàn phím điều hướng WAI-ARIA và phản hồi xúc giác haptics.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Text Inputs -->
            <Card title="Ô NHẬP LIỆU NEO-BRUTALIST (INPUT)" badge="FORM" badgeColor="yellow">
              <div class="space-y-4">
                <Input
                  label="TÊN PHÂN HỆ HỆ THỐNG"
                  placeholder="Nhập tên module..."
                  bind:value={sampleInputText}
                  helperText="Tên định danh kỹ thuật trong sơ đồ vi kiến trúc."
                />

                <Input
                  label="EMAIL LIÊN HỆ KỸ THUẬT"
                  placeholder="name@domain.com"
                  type="email"
                  bind:value={sampleEmailText}
                />

                <Input
                  label="TRƯỜNG BỊ BÁO LỖI (ERROR STATE)"
                  placeholder="Nhập giá trị hợp lệ..."
                  value="127.0.0.1:invalid-port"
                  error="Cổng port không hợp lệ! Bắt buộc phải là số từ 1 đến 65535."
                />
              </div>
            </Card>

            <!-- Select Picker & Switches -->
            <Card title="BỘ CHỌN SELECT & CÔNG TẮC CƠ HỌC" badge="ARK UI ZAG" badgeColor="cyan">
              <div class="space-y-6">
                <!-- Select Picker -->
                <div>
                  <SelectPicker
                    label="BỘ CHỌN CÔNG NGHỆ (SELECT PICKER)"
                    options={sampleSelectOptions}
                    bind:value={sampleSelectValue}
                  />
                  <p class="font-mono text-[10px] text-neutral-500 mt-2">
                    GIÁ TRỊ CHỌN: <strong class="text-[#FF007A]">{sampleSelectValue}</strong>
                  </p>
                </div>

                <!-- Mechanical Switches -->
                <div class="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div class="font-mono text-xs font-bold text-neutral-500 uppercase">CÔNG TẮC CƠ HỌC (MECHANICAL SWITCHES):</div>
                  <Switch
                    bind:checked={switchAutoSync}
                    label="TỰ ĐỘNG ĐỒNG BỘ TELEMETRY DỮ LIỆU"
                  />
                  <Switch
                    bind:checked={switchHaptics}
                    label="KÍCH HOẠT RUNG PHẢN HỒI WEB HAPTICS"
                  />
                  <Switch
                    bind:checked={switchDeepOled}
                    label="CHẾ ĐỘ DEEP OLED KHÔNG DÍNH VIỀN TRẮNG"
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

      <!-- ================================================================= -->
      <!-- 03. CARDS & ACCORDION -->
      <!-- ================================================================= -->
      {:else if activeTabDemo === 'layout'}
        <div class="space-y-8">
          <div>
            <div class="font-mono text-xs font-black uppercase text-[#FF007A] tracking-wider mb-1">
              ■ COMPONENT MATRIX 03
            </div>
            <h2 class="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white">
              THẺ BỀ MẶT (CARDS) & HỘP MỞ RỘNG (ACCORDION)
            </h2>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Cấu trúc phân tầng bề mặt Deep Charcoal (#0E0E10, #18181B) kèm bóng Cyber Neon tách lớp.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Card 1 -->
            <Card title="CARD VÀNG ACID NEON" badge="01 / HOT" badgeColor="yellow">
              <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                Bề mặt thẻ phân tầng sâu, bóng đổ vàng neon góc 90 độ rực rỡ, chữ đen tương phản cao trên badge.
              </p>
              <Button variant="primary" size="sm" class="w-full">THAO TÁC CARD 1</Button>
            </Card>

            <!-- Card 2 -->
            <Card title="CARD XANH ELECTRIC CYAN" badge="02 / SPEED" badgeColor="cyan">
              <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                Bóng đổ Cyan góc 90 độ, viền sáng Zinc crisp không bao giờ bị hòa tan vào nền đen pitch-black.
              </p>
              <Button variant="secondary" size="sm" class="w-full">THAO TÁC CARD 2</Button>
            </Card>

            <!-- Card 3 -->
            <Card title="CARD HỒNG CYBER MAGENTA" badge="03 / CORE" badgeColor="magenta">
              <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                Thẻ cảnh báo hoặc tâm điểm thị giác. Tương phản tuyệt đối, chuẩn WCAG AAA.
              </p>
              <Button variant="danger" size="sm" class="w-full">THAO TÁC CARD 3</Button>
            </Card>
          </div>

          <!-- Accordion Showcase -->
          <Card title="HỘP NỘI DUNG MỞ RỘNG (ACCORDION SUITE)" badge="COLLAPSIBLE" badgeColor="lime">
            <Accordion items={demoAccordionItems} />
          </Card>
        </div>

      <!-- ================================================================= -->
      <!-- 04. LOADERS & TOAST -->
      <!-- ================================================================= -->
      {:else if activeTabDemo === 'feedback'}
        <div class="space-y-8">
          <div>
            <div class="font-mono text-xs font-black uppercase text-[#00FF66] tracking-wider mb-1">
              ■ COMPONENT MATRIX 04
            </div>
            <h2 class="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white">
              TIẾN TRÌNH (LOADERS), KHUNG XƯƠNG (SKELETONS) & HỘP THOẠI (DIALOG / TOAST)
            </h2>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Phản hồi trạng thái động, khóa cuộn trang nền tuyệt đối và thông báo nổi cơ học.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Progress & Skeletons -->
            <Card title="TIẾN TRÌNH SỌC NGUY HIỂM & KHUNG XƯƠNG" badge="DYNAMIC" badgeColor="yellow">
              <div class="space-y-5">
                <Loader progress={sampleLoaderProgress} label="TIẾN TRÌNH SỌC VÀNG (YELLOW HAZARD)" variant="yellow" />
                <Loader progress={45} label="TIẾN TRÌNH XANH CYAN (CYAN RUNTIME)" variant="cyan" />
                <Loader progress={90} label="TIẾN TRÌNH HỒNG MAGENTA (HIGH PRIORITY)" variant="magenta" />

                <div class="flex items-center gap-3 pt-2">
                  <span class="font-mono text-xs text-neutral-500 uppercase">THỬ NGHIỆM %:</span>
                  <button onclick={() => sampleLoaderProgress = Math.max(10, sampleLoaderProgress - 15)} class="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 font-mono text-xs font-bold border border-black dark:border-white cursor-pointer">-15%</button>
                  <button onclick={() => sampleLoaderProgress = Math.min(100, sampleLoaderProgress + 15)} class="px-2 py-1 bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] font-mono text-xs font-bold border border-black dark:border-white cursor-pointer">+15%</button>
                </div>

                <div class="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                  <div class="font-mono text-xs font-bold text-neutral-500 uppercase mb-2">HATCHED SKELETON LOADERS (ANIMATED PULSE):</div>
                  <Skeleton height="h-7" />
                  <Skeleton height="h-7" />
                  <Skeleton height="h-14" />
                </div>
              </div>
            </Card>

            <!-- Modals & Toasts Triggers -->
            <Card title="HỘP THOẠI DIALOG / DRAWER & TOAST ALERTS" badge="OVERLAYS" badgeColor="magenta">
              <div class="space-y-6">
                <!-- Modal Trigger -->
                <div>
                  <div class="font-mono text-xs font-bold text-neutral-500 uppercase mb-2">HỘP THOẠI (RESPONSIVE MODAL & BOTTOM SHEET):</div>
                  <p class="text-xs text-neutral-600 dark:text-neutral-300 mb-3 leading-relaxed">
                    Tự động biến hình thành <strong>Bottom Sheet Drawer</strong> trên màn hình di động (&lt; 768px) và <strong>Centered Dialog</strong> trên máy tính, khóa cứng cuộn trang nền (Rule 11).
                  </p>
                  <Button variant="primary" onclick={() => isModalOpen = true}>
                    MỞ DIALOG / BOTTOM DRAWER &rarr;
                  </Button>
                </div>

                <!-- Toast Triggers -->
                <div class="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <div class="font-mono text-xs font-bold text-neutral-500 uppercase mb-3">KÍCH HOẠT CÁC LOẠI TOAST ALERTS:</div>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      onclick={() => showToast('success', 'Thao tác transaction dữ liệu thành công!')}
                      class="btn-tactile p-2.5 font-mono text-xs font-bold uppercase bg-[#00FF66] text-black border-2 border-black shadow-[2px_2px_0px_#000] dark:bg-[#04200E] dark:text-[#00FF7F] dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
                    >
                      ✔ TOAST SUCCESS
                    </button>
                    <button
                      onclick={() => showToast('info', 'Thông tin telemetry đã cập nhật lên phiên bản mới.')}
                      class="btn-tactile p-2.5 font-mono text-xs font-bold uppercase bg-[#00F0FF] text-black border-2 border-black shadow-[2px_2px_0px_#000] dark:bg-[#031C20] dark:text-[#00F0FF] dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
                    >
                      ℹ TOAST INFO
                    </button>
                    <button
                      onclick={() => showToast('warning', 'Cảnh báo bộ nhớ tạm đạt ngưỡng 85% dung lượng.')}
                      class="btn-tactile p-2.5 font-mono text-xs font-bold uppercase bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_#000] dark:bg-[#1C1900] dark:text-[#FFE600] dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
                    >
                      ⚠ TOAST WARNING
                    </button>
                    <button
                      onclick={() => showToast('error', 'Lỗi kết nối node mạng phân tán! Đang thử lại...')}
                      class="btn-tactile p-2.5 font-mono text-xs font-bold uppercase bg-[#FF007A] text-white border-2 border-black shadow-[2px_2px_0px_#000] dark:bg-[#200412] dark:text-[#FF1A8C] dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
                    >
                      ✖ TOAST ERROR
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

      <!-- ================================================================= -->
      <!-- 05. 16 IRON RULES CATALOG -->
      <!-- ================================================================= -->
      {:else if activeTabDemo === 'rules'}
        <div class="space-y-6">
          <div>
            <div class="font-mono text-xs font-black uppercase text-[#00FF66] tracking-wider mb-1">
              ■ TIÊU CHUẨN THIẾT KẾ BẮT BUỘC
            </div>
            <h2 class="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-black dark:text-white">
              BỘ 16 ĐIỀU LUẬT THIẾT KẾ HYPER NEO-BRUTALISM × ARK UI
            </h2>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Mã hiệu: ISO-NEO-BRUTALISM-2026.04. Mọi component và layout đều bắt buộc tuân thủ không ngoại lệ.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each DESIGN_SYSTEM_RULES as rule}
              <div class="p-5 border-[3px] border-black dark:border-white bg-white dark:bg-[#121214] shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFFFFF] flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-mono text-xs font-black px-2 py-0.5 bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] border border-black dark:border-white">
                      RULE #{rule.ruleNumber}
                    </span>
                    <span class="font-mono text-[10px] text-neutral-500 uppercase">{rule.name}</span>
                  </div>
                  <h3 class="font-sans font-black text-base uppercase text-black dark:text-white leading-tight">
                    {rule.title}
                  </h3>
                  <p class="text-xs text-neutral-600 dark:text-neutral-300 mt-2 leading-relaxed">
                    {rule.description}
                  </p>
                </div>

                <div class="pt-3 border-t border-neutral-200 dark:border-neutral-800 font-mono text-[11px] space-y-1">
                  <div class="text-[#FF007A]">
                    <strong>VI PHẠM:</strong> {rule.badCode}
                  </div>
                  <div class="text-[#00FF66]">
                    <strong>CHUẨN:</strong> {rule.goodCode}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

    </div>

    <!-- Bottom Footer Navigation -->
    <footer class="p-6 sm:p-8 bg-black text-white font-mono text-xs flex flex-col sm:flex-row justify-between items-center gap-4 border-t-[3px] md:border-t-[4px] border-black dark:border-white">
      <div>
        <strong>ENGBBQ COMPONENT LAB</strong> &bull; SVELTE 5 RUNES &bull; ARK UI SUITE
      </div>
      <div class="flex items-center gap-4 text-[#00F0FF]">
        <button onclick={() => { triggerHaptic('mediumClick'); onnavigate?.('portfolio'); }} class="hover:underline font-bold cursor-pointer">
          &larr; QUAY LẠI HỒ SƠ ZERA
        </button>
        <span>&bull;</span>
        <button onclick={() => activeTabDemo = 'buttons'} class="hover:underline cursor-pointer">BUTTONS</button>
        <span>&bull;</span>
        <button onclick={() => activeTabDemo = 'rules'} class="hover:underline cursor-pointer">16 ĐIỀU LUẬT</button>
      </div>
    </footer>
  </div>

  <!-- Responsive Dialog & Drawer Modal -->
  <DialogDrawer bind:open={isModalOpen} title="DEMO HỘP THOẠI DIALOG & BOTTOM SHEET">
    <div class="space-y-4 font-sans text-sm">
      <p class="leading-relaxed">
        Hộp thoại này minh họa tính năng <strong>biến hình responsive tự động</strong>:
      </p>
      
      <div class="space-y-2 font-mono text-xs">
        <div class="p-3 bg-neutral-100 dark:bg-[#18181B] border-2 border-black dark:border-white">
          <strong>TRÊN MÁY TÍNH (DESKTOP):</strong> Căn giữa màn hình (Center Modal Dialog), viền 4px, bóng 12px, giới hạn max-w-lg.
        </div>
        <div class="p-3 bg-neutral-100 dark:bg-[#18181B] border-2 border-black dark:border-white">
          <strong>TRÊN DI ĐỘNG (MOBILE):</strong> Trượt từ đáy màn hình lên (Bottom Sheet Drawer), có thanh kéo drag-handle.
        </div>
        <div class="p-3 bg-[#FFE600] text-black dark:bg-[#1C1900] dark:text-[#FFE600] border-2 border-black dark:border-white font-bold">
          KHÓA CUỘN NỀN (RULE 11): Trang web phía sau bị khóa cuộn 100% khi mở hộp thoại!
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <Button variant="primary" onclick={() => isModalOpen = false}>
          ĐÓNG HỘP THOẠI
        </Button>
      </div>
    </div>
  </DialogDrawer>

  <!-- Toast Notification Alert -->
  <Toast
    bind:visible={isToastVisible}
    title="COMPONENT LAB TOAST"
    message={toastMsg}
    type={toastType}
  />
</div>

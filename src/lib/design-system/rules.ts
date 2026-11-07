export interface DesignRule {
  ruleNumber: number;
  id: string;
  name: string;
  title: string;
  description: string;
  badPractice: string;
  goodPractice: string;
}

export const KAIROS_DESIGN_RULES: readonly DesignRule[] = [
  {
    ruleNumber: 1,
    id: 'STATE_MACHINE_SOVEREIGNTY',
    name: 'State Machine Sovereignty',
    title: 'Chủ Quyền Máy Trạng Thái Hữu Hạn (FSM)',
    description: 'Mọi component có tính tương tác phức tạp (Dialog, Tabs, Accordion, Tooltip, Toast) phải được điều khiển bởi cỗ máy trạng thái của Ark UI / Zag.js. Cấm dùng cờ boolean lỏng lẻo gây lệch chuẩn WAI-ARIA.',
    badPractice: 'Dùng let isOpen = true/false manh mún khiến kẹt focus và rò rỉ sự kiện cuộn.',
    goodPractice: 'Sử dụng Ark UI State Machine quản lý đầy đủ transition, keyboard trap và aria attributes.',
  },
  {
    ruleNumber: 2,
    id: 'HAIRLINE_OPTICAL_PRECISION',
    name: 'Hairline Optical Precision',
    title: 'Độ Chính Xác Viền Tinh Thể 1px',
    description: 'Không sử dụng viền dày thô (3px-4px). Toàn bộ bề mặt Card, Input, Button, Dialog đều sử dụng viền Hairline 1px với border-zinc-800 và viền trên phản quang border-t-zinc-700/50 tạo chiều sâu 3D.',
    badPractice: 'Viền đen dày 4px tạo cảm giác nặng nề, thiếu tinh tế cho một hệ thống AI cao cấp.',
    goodPractice: 'Viền hairline 1px kết hợp ánh sáng môi trường (ambient top highlight) chuẩn Linear.',
  },
  {
    ruleNumber: 3,
    id: 'DEEP_CHROMATIC_SCALE',
    name: 'Deep Multi-Tier Chromatic Scale',
    title: 'Phân Tầng Bóng Đêm 5 Cấp (OLED Deep Tiers)',
    description: 'Dark Mode tuân thủ 5 cấp bậc: Canvas #09090b -> Surface #121215 -> Controls #18181b -> Overlay #1c1c21 -> Interactive #27272a, giúp mắt phân biệt ngay độ sâu không gian.',
    badPractice: 'Dùng một màu đen kịt đồng nhất làm mọi card dính chặt vào nền không có chiều sâu.',
    goodPractice: 'Phân tầng bề mặt có thứ bậc giúp người dùng cảm nhận rõ độ nổi và phân cấp thông tin.',
  },
  {
    ruleNumber: 4,
    id: 'PURE_MOBILE_WEB_ZERO_SCROLL',
    name: 'Pure Mobile Web First & Zero Horizontal Scroll',
    title: 'Mobile Web Thuần Túy: Bãi Bỏ Bottom Toolbar & Cấm Cuộn Ngang',
    description: 'Trải nghiệm Mobile Web thuần khiết không giả lập PWA hay native app: Bãi bỏ hoàn toàn bottom toolbar/dock nổi để không xung đột với thanh địa chỉ Safari/Chrome. 100% item, bento card, số liệu PHẢI hiển thị trọn vẹn trong luồng cuộn dọc tự nhiên hoặc lưới 2 cột nhỏ gọn. Cấm cuộn ngang làm giấu thông tin. Mọi ô nhập liệu font-size >= 16px chống auto-zoom.',
    badPractice: 'Đặt bottom dock nổi chèn ép thanh URL trình duyệt, hoặc dùng carousel ngang giấu card ra ngoài màn hình.',
    goodPractice: 'Điều hướng bằng Header dính + Slide Drawer mượt mà; toàn bộ nội dung cuộn dọc tự nhiên, ngón cái tự do lướt.',
  },
  {
    ruleNumber: 5,
    id: 'VIETNAMESE_DIACRITIC_SPACING',
    name: 'Vietnamese Diacritic Harmonic Spacing',
    title: 'Khoảng Thở Dấu Thanh Tiếng Việt',
    description: 'Tiêu đề chữ hoa tiếng Việt nhiều dòng bắt buộc line-height tối thiểu từ 1.25 đến 1.35. Ưu tiên font Be Vietnam Pro với bộ glyph dấu thanh đôi hoàn chỉnh.',
    badPractice: 'Dùng leading-none làm dấu nặng và móc của dòng trên đè lên đầu chữ dòng dưới.',
    goodPractice: 'Line-height tối thiểu 1.25 bảo đảm không gian thở thoáng đãng, dấu thanh sắc sảo.',
  },
  {
    ruleNumber: 6,
    id: 'LUMINESCENT_ACCENT_DISCIPLINE',
    name: 'Luminescent Accent Discipline & Brand Primary',
    title: 'Kỷ Luật Điểm Nhấn Ngọc Lục Bảo & Nút Primary',
    description: 'Nút Primary hành động chính mang bản sắc Emerald ngọc lục bảo chữ trắng tinh thể kèm ánh sáng hào quang. Nút Contrast dành riêng cho trường hợp đảo sắc đen/trắng Vercel.',
    badPractice: 'Nút Primary biến thành khối trắng tinh gây chói mắt trong Dark Mode, hoặc chữ đen trên nền xanh lá.',
    goodPractice: 'Primary là Emerald-600 chữ trắng sắc nét; Contrast là đen/trắng đơn sắc; các điểm nhấn Cyan/Violet phân tầng chuẩn xác.',
  },
  {
    ruleNumber: 7,
    id: 'KEYBOARD_FIRST_WAI_ARIA',
    name: 'Keyboard-First & WAI-ARIA Strict Compliance',
    title: 'Chuẩn Tiếp Cận Bàn Phím & Trợ Năng Toàn Diện',
    description: 'Hỗ trợ phím tắt chuẩn W3C: Tab, Arrow keys điều hướng Tabs/Accordion, Escape đóng Dialog/Menu. Đầy đủ aria-expanded, aria-controls, roving tabindex.',
    badPractice: 'Không hỗ trợ bàn phím, người dùng phím hoặc đọc màn hình không thể sử dụng được trang.',
    goodPractice: '100% linh kiện Ark UI kế thừa máy trạng thái Zag.js đạt chuẩn WAI-ARIA APG.',
  },
  {
    ruleNumber: 8,
    id: 'FLUID_BENTO_MODULAR_GRID',
    name: 'Fluid Bento Modular Grid (Zero Horizontal Overflow)',
    title: 'Bố Cục Lưới Bento Đa Tầng Không Tràn Viền',
    description: 'Layout áp dụng cấu trúc Bento Box hiện đại: 1 cột (hoặc 2 cột số liệu compact) trên Mobile (< 768px), 2 cột trên Tablet, 3-4 cột trên Desktop. Đảm bảo toàn bộ thẻ card nằm trọn vẹn trong viewport, tuyệt đối không tạo thanh cuộn ngang toàn trang (overflow-x: hidden).',
    badPractice: 'Cố định kích thước card hoặc dùng carousel ngang giấu nội dung ra rìa màn hình làm vỡ luồng đọc dọc.',
    goodPractice: 'Lưới Bento hiển thị toàn bộ thẻ theo chiều dọc tự nhiên, ngón cái lướt êm ái không cần chuyển hướng vuốt ngang.',
  },
  {
    ruleNumber: 9,
    id: 'DYNAMIC_ISLAND_TOP_TOAST',
    name: 'Dynamic Island Top-Anchored Toast',
    title: 'Thông Báo Neo Đỉnh Chuẩn Banner',
    description: 'Mọi thông báo Toast trên di động phải neo ở đỉnh màn hình (top-4 left-4 right-4), trượt từ trên xuống với hiệu ứng lò xo mượt mà, không che thanh điều hướng.',
    badPractice: 'Đặt Toast dưới đáy màn hình xung đột với thanh vuốt Home của iPhone và ngón tay cái.',
    goodPractice: 'Neo đỉnh màn hình chuẩn Banner/Dynamic Island thông thoáng và dễ nhận biết.',
  },
  {
    ruleNumber: 10,
    id: 'SCROLL_LOCK_STABILITY',
    name: 'Scrollbar Gutter Permanent Stability',
    title: 'Khóa Cuộn Ổn Định Tuyệt Đối',
    description: 'Khai báo scrollbar-gutter: stable trên html. Khi Ark UI khóa cuộn để mở Dialog, trang web không bao giờ bị giật lề ngang sang phải do biến mất thanh cuộn.',
    badPractice: 'Mở modal làm mất scrollbar, toàn bộ nội dung trang bên dưới bị giật cục sang phải 15px.',
    goodPractice: 'Giữ rãnh cuộn ổn định vĩnh viễn, chuyển cảnh modal êm ái như ứng dụng native.',
  },
  {
    ruleNumber: 11,
    id: 'SPRING_PHYSICS_MOTION',
    name: 'Spring Physics & Micro-Interactions',
    title: 'Chuyển Động Vật Lý Tự Nhiên (Spring Physics)',
    description: 'Thời lượng chuyển động không quá 180ms. Sử dụng đường cong cubic-bezier(0.16, 1, 0.3, 1) tạo cảm giác nhấp nhả cơ học nhẹ nhàng, dứt khoát.',
    badPractice: 'Animation kéo dài 500ms lờ đờ khiến người dùng cảm thấy giao diện bị lag.',
    goodPractice: 'Phản hồi dứt khoát dưới 120ms-180ms, mang lại trải nghiệm mượt mà, siêu nhạy.',
  },
  {
    ruleNumber: 12,
    id: 'ZERO_MONOLITHIC_BLOAT',
    name: 'Zero Monolithic Bloat',
    title: 'Kỷ Luật Tinh Khiết Không Rác Mã Nguồn',
    description: 'Không nhúng thư viện CSS-in-JS cồng kềnh. Sử dụng hoàn toàn Tailwind CSS v4 kết hợp Ark UI Svelte primitives, bảo đảm gói build luôn siêu nhẹ dưới 150KB gzip.',
    badPractice: 'Cài thư viện 2MB chỉ để lấy vài cái nút bấm, làm chậm thời gian tải trang.',
    goodPractice: 'Mã nguồn Svelte 5 thuần khiết, tree-shaking tối đa, tải xong trang trong 0.2 giây.',
  },
] as const;

// ============================================================================
// PURE MOBILE WEB ENGINEERING DIRECTIVES (10 IRON RULES FOR MOBILE WEB ONLY)
// Strictly enforced for pure browser environments (Safari iOS & Chrome Android)
// ============================================================================

export interface MobileWebRule {
  id: string;
  category: 'Viewport' | 'Layout' | 'Touch' | 'Typography' | 'State';
  commandment: string;
  rationale: string;
  cssImplementation: string;
}

export const KAIROS_MOBILE_WEB_RULES: readonly MobileWebRule[] = [
  {
    id: 'NO_BOTTOM_TOOLBAR',
    category: 'Layout',
    commandment: 'Bãi bỏ hoàn toàn bottom toolbar / floating dock nổi ở đáy màn hình.',
    rationale: 'Tránh xung đột trực tiếp với Dynamic Bottom Address Bar của Safari iOS 15+ và Chrome Android; trả lại 100% không gian hiển thị cho trục đọc dọc.',
    cssImplementation: 'Bỏ position: fixed bottom-x; điều hướng chuyển toàn bộ về Header dính (sticky top-0) + Slide-over Drawer.',
  },
  {
    id: 'ZERO_HORIZONTAL_CAROUSEL',
    category: 'Layout',
    commandment: 'Cấm giấu nội dung cốt lõi vào carousel cuộn ngang (Zero Horizontal Scroll).',
    rationale: 'Nghiên cứu Nielsen Norman Group chỉ ra rằng cuộn ngang trên mobile làm giảm tới 58% khả năng tiếp cận nội dung (Banner Blindness). Người dùng mobile cuộn 100% theo trục dọc.',
    cssImplementation: 'grid grid-cols-2 gap-2.5 cho các metrics ngắn; flex-col w-full cho cards nội dung dài.',
  },
  {
    id: 'DYNAMIC_VIEWPORT_DVH',
    category: 'Viewport',
    commandment: 'Luôn sử dụng 100dvh (Dynamic Viewport Height) cho Drawer, Modal và Full-screen panels.',
    rationale: '100vh trên iOS Safari bị tính lẹm vào vùng thanh địa chỉ, làm cụt nút bấm ở chân modal khi thanh địa chỉ co giãn.',
    cssImplementation: 'min-h-[100dvh] h-[100dvh] kết hợp pb-[max(env(safe-area-inset-bottom),1rem)].',
  },
  {
    id: 'ANTI_AUTO_ZOOM_INPUTS',
    category: 'Typography',
    commandment: 'Tất cả các thẻ input, select, textarea trên màn hình < 768px bắt buộc font-size >= 16px.',
    rationale: 'iOS Safari tự động phóng to trang web (auto-zoom) khi người dùng chạm vào ô input có font nhỏ hơn 16px, làm vỡ khung nhìn.',
    cssImplementation: 'text-base sm:text-sm (16px trên mobile, 14px trên desktop) hoặc input { font-size: 16px !important }.',
  },
  {
    id: 'FULL_WIDTH_THUMB_ACTIONS',
    category: 'Touch',
    commandment: 'Mọi nút bấm CTA chính trong Hero và Modal phải dàn rộng 100% bề ngang (w-full sm:w-auto).',
    rationale: 'Ngón tay cái của người dùng cầm điện thoại bằng 1 tay (trái hoặc phải) có thể chạm tới nút bấm dễ dàng mà không bị với.',
    cssImplementation: 'w-full sm:w-auto min-h-[44px] justify-center.',
  },
  {
    id: 'TOUCH_TARGET_44PX',
    category: 'Touch',
    commandment: 'Diện tích chạm tối thiểu của mọi phần tử tương tác là 44px × 44px (Apple HIG & WCAG 2.5.5).',
    rationale: 'Tránh hiện tượng ngón tay cái chạm nhầm (fat-finger error) vào các nút lân cận trên màn hình cảm ứng điện dung.',
    cssImplementation: 'min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 active:scale-[0.97].',
  },
  {
    id: 'ZERO_CLICK_DELAY',
    category: 'Touch',
    commandment: 'Loại bỏ hoàn toàn độ trễ 300ms và viền nháy xanh mặc định của trình duyệt di động.',
    rationale: 'Trình duyệt di động mặc định chờ 300ms để phân biệt double-tap zoom; thao tác cảm ứng cần phản hồi cơ học tức thì 0ms.',
    cssImplementation: 'touch-action: manipulation; -webkit-tap-highlight-color: transparent;.',
  },
  {
    id: 'AGGRESSIVE_TOKEN_WRAPPING',
    category: 'Typography',
    commandment: 'Áp dụng ngắt từ triệt để (overflow-wrap: anywhere) cho các chuỗi mã nguồn, hash, email và URL.',
    rationale: 'Các chuỗi kỹ thuật dài không có dấu cách sẽ đẩy bề rộng tài liệu vượt quá 100vw, tạo ra lỗi thanh cuộn ngang trang.',
    cssImplementation: 'break-words overflow-wrap: anywhere; max-w-full;.',
  },
  {
    id: 'VIETNAMESE_DIACRITIC_AIRSPACE',
    category: 'Typography',
    commandment: 'Tiêu đề chữ hoa tiếng Việt nhiều dòng bắt buộc line-height từ 1.25 đến 1.35.',
    rationale: 'Dấu thanh đôi (dấu hỏi, ngã, mũ, móc) trên mobile dễ bị dòng trên đè lên đầu dòng dưới nếu dùng leading-none.',
    cssImplementation: 'leading-[1.28] sm:leading-[1.25] tracking-tight.',
  },
  {
    id: 'OVERSCROLL_LOCK_CONTAIN',
    category: 'State',
    commandment: 'Sử dụng overscroll-behavior: contain khi mở Drawer hoặc Modal trên Mobile Web.',
    rationale: 'Ngăn chặn hiện tượng kéo trượt trang nền (Scroll Chaining / Pull-to-refresh) khi người dùng cuộn nội dung trong Drawer.',
    cssImplementation: 'overscroll-contain trên Dialog.Content và Dialog.Backdrop.',
  },
] as const;

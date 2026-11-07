/**
 * ============================================================================
 * HYPER NEO-BRUTALISM × ARK UI DESIGN SYSTEM: 10 IRON RULES
 * ============================================================================
 * Standard: ISO-NEO-BRUTALISM-2026.04
 * 
 * Every agent, engineer, and component implementation MUST comply with these
 * 10 mandatory rules. Any deviation is considered a design regression.
 */

export const DESIGN_SYSTEM_RULES = [
  {
    ruleNumber: 1,
    name: 'RADICAL_BOUNDARY_LAW',
    title: 'Quy luật Viền Mực Đen Tuyệt Đối',
    description: 
      'Mọi khối Card, Nút bấm, Ô nhập liệu, Badge, Modal đều phải có viền mực đen tối thiểu 3px hoặc 4px solid (hoặc viền trắng crisp 3.5px-4px trong Dark Mode). Tuyệt đối cấm xóa viền (border: none) trên các phần tử tương tác.',
    badCode: 'border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);',
    goodCode: 'border: 4px solid var(--border-radical); box-shadow: var(--shadow-level3);',
  },
  {
    ruleNumber: 2,
    name: 'ZERO_BLUR_SHADOW_MANDATE',
    title: 'Bóng Cứng Góc 90 Độ - Cấm Tuyệt Đối Blur',
    description: 
      'Mọi bóng đổ phải là bóng cứng (Hard Offset Shadow) với bán kính mờ r = 0px (ví dụ: 4px 4px 0px, 8px 8px 0px). Cấm sử dụng bóng mờ khuếch tán (gaussian blur shadows) như trong Material Design hay Glassmorphism.',
    badCode: 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);',
    goodCode: 'box-shadow: 6px 6px 0px var(--shadow-color);',
  },
  {
    ruleNumber: 3,
    name: 'TACTILE_PRESS_FEEDBACK',
    title: 'Phản Hồi Cơ Học Tức Thời Khi Nhấn',
    description: 
      'Khi phần tử tương tác (button, card link) được nhấn (:active), nó phải di chuyển theo trục X và Y đồng thời triệt tiêu độ dời của bóng (ví dụ: translate(4px, 4px) và shadow giảm về 0px 0px 0px). Tạo cảm giác cơ học như phím bấm Arcade.',
    badCode: 'button:active { opacity: 0.8; }',
    goodCode: 'button:active { transform: translate(4px, 4px); box-shadow: 0px 0px 0px #000; }',
  },
  {
    ruleNumber: 4,
    name: 'ARK_UI_HEADLESS_SOVEREIGNTY',
    title: 'Quản Lý Trạng Thái Bằng Ark UI State Machines',
    description: 
      'Mọi linh kiện có trạng thái phức tạp (Accordion, Dialog, Tabs, Popover, Slider, Menu, Tooltip) bắt buộc phải sử dụng Ark UI headless primitives (@ark-ui/svelte) để Zag.js điều khiển logic máy trạng thái và chuẩn WAI-ARIA. Lớp CSS chỉ thuần túy gắn qua class Tailwind.',
    badCode: 'let isOpen = false; <div onclick={() => isOpen = !isOpen}>...</div>',
    goodCode: '<Accordion.Root> <Accordion.Item> ... </Accordion.Item> </Accordion.Root>',
  },
  {
    ruleNumber: 5,
    name: 'SPATIAL_8PT_DISCIPLINE',
    title: 'Kỷ Luật Không Gian 8-Point Grid',
    description: 
      'Mọi padding, margin, gap phải chia hết cho 8px (hoặc 4px cho micro-spacing). Không sử dụng các giá trị tùy tiện như 7px, 11px, 19px, 23px.',
    badCode: 'padding: 13px 21px;',
    goodCode: 'padding: var(--spacing-4) var(--spacing-6); /* 16px 24px */',
  },
  {
    ruleNumber: 6,
    name: 'POP_ART_SATURATION_BALANCE',
    title: 'Cân Bằng Màu Sắc Siêu Bão Hòa 60-30-10',
    description: 
      'Bảng màu Pop Art (Acid Yellow, Hot Magenta, Cyber Lime, Hyper Cyan) chỉ chiếm 10% - 20% bề mặt để tạo điểm nhấn thị giác. 60% diện tích vẫn phải là nền Canvas trung tính (Kem ấm/Trắng hoặc Đen OLED) để tránh mỏi mắt người dùng.',
    badCode: 'Toàn bộ trang web biến thành màu vàng chói lóa không có khoảng nghỉ.',
    goodCode: 'Nền kem ấm, thẻ màu trắng, nút bấm và badge điểm sắc vàng #FFE600 & hồng #FF007A.',
  },
  {
    ruleNumber: 7,
    name: 'TYPOGRAPHIC_MASSIFNESS',
    title: 'Kiểu Chữ Khối Lượng Cực Đại Căn Lề Trái',
    description: 
      'Tiêu đề chính bắt buộc dùng font Display dày dặn (Font-Weight 900), viết hoa, tracking co hẹp (-0.04em đến -0.05em). Luôn căn lề trái tự nhiên (flush-left), cấm căn đều 2 bên (justified).',
    badCode: 'font-weight: 300; text-align: justify;',
    goodCode: 'font-weight: 900; letter-spacing: -0.05em; text-align: left; text-transform: uppercase;',
  },
  {
    ruleNumber: 8,
    name: 'MECHANICAL_TIMING_CURVE',
    title: 'Thời Gian Chuyển Đổi Siêu Tốc (Dưới 150ms)',
    description: 
      'Thời lượng chuyển đổi trạng thái phải nằm trong khoảng 80ms - 120ms với đường cong gia tốc cubic-bezier(0.16, 1, 0.3, 1). Tuyệt đối cấm các animation chậm chạp, kéo rê (>250ms) gây cảm giác lag cho người dùng.',
    badCode: 'transition: all 400ms ease-in-out;',
    goodCode: 'transition: transform 100ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 100ms cubic-bezier(0.16, 1, 0.3, 1);',
  },
  {
    ruleNumber: 9,
    name: 'STICKER_DYNAMIC_ROTATION',
    title: 'Huy Hiệu & Sticker Nghiêng Nhẹ Động',
    description: 
      'Các tag pill, huy hiệu trạng thái, sticker quảng bá có thể xoay nghiêng nhẹ từ -2° đến +3° để tạo sự phá cách, tự do của thẩm mỹ Zine/Punk văn hóa indie-hacker.',
    badCode: 'Mọi thẻ đều vuông vức 100% không có điểm nhấn ngẫu hứng.',
    goodCode: 'transform: rotate(-2deg); box-shadow: 3px 3px 0px #000;',
  },
  {
    ruleNumber: 10,
    name: 'WCAG_CONTRAST_SOVEREIGNTY',
    title: 'Bảo Đảm Tương Phản Tiếp Cận Tuyệt Đối',
    description: 
      'Chữ màu đen trên nền vàng, trắng, cyan hoặc lime luôn đạt tỷ lệ tương phản tối thiểu 10:1 (vượt xa chuẩn WCAG AAA 7:1). Trong Dark Mode, chữ trắng trên nền đen đạt 21:1. Không bao giờ đặt chữ màu vàng neon trên nền trắng.',
    badCode: 'Chữ màu vàng #FFE600 đặt trên nền trắng #FFFFFF (Tương phản 1.2:1 - Vi phạm nghiêm trọng).',
    goodCode: 'Chữ đen #000000 trên nền vàng #FFE600 (Tương phản 17.5:1 - Đạt chuẩn WCAG AAA).',
  },
  {
    ruleNumber: 11,
    name: 'BODY_SCROLL_LOCK_LAW',
    title: 'Khóa Cuộn Nền Tuyệt Đối Khi Mở Modal / Drawer / Sheet',
    description: 
      'Khi bất kỳ lớp phủ nào (Dialog, Bottom Sheet Drawer, Select Picker) được mở ra, cuộn trang phía sau bắt buộc phải bị khóa hoàn toàn (document.body.style.overflow = "hidden", touchAction = "none"). Chỉ cho phép cuộn bên trong nội dung hộp thoại (overscroll-behavior: contain). Khi đóng lại hoặc unmount, trạng thái cuộn nền bắt buộc phải được hoàn trả nguyên vẹn.',
    badCode: 'Mở Drawer/Modal mà người dùng vẫn dùng ngón tay/chuột cuộn được trang web phía sau làm trôi giao diện.',
    goodCode: '$effect(() => { if (open) { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; } });',
  },
  {
    ruleNumber: 12,
    name: 'CLEAN_HEADROOM_LAW',
    title: 'Tiêu Đề Tinh Giản - Loại Bỏ Yếu Tố Chuyển Động Vụn Vặt',
    description: 
      'Khu vực Header & Masthead phải luôn ổn định, sắc nét và tập trung vào nhận diện thương hiệu cũng như điều hướng cốt lõi. Tuyệt đối không nhồi nhét các dải chữ chạy liên tục (Marquee Ticker) gây xao nhãng thị giác và tăng mức tiêu thụ pin của CPU/GPU trên thiết bị di động.',
    badCode: 'Chèn thanh chữ chạy marquee liên tục chiếm 30px đỉnh trang che mất tầm nhìn.',
    goodCode: 'Header phẳng cố định, viền mực 3px-4px, logo to rõ, nút điều hướng và toggle theme đanh gọn.',
  },
  {
    ruleNumber: 13,
    name: 'NATURAL_RESPONSIVE_DISCIPLINE',
    title: 'Kỷ Luật Responsive Tự Nhiên Không Dùng Switcher Thủ Công',
    description: 
      'Hệ thống giao diện sản xuất (Production) phải vận hành 100% tự động dựa trên truy vấn môi trường CSS Media Queries (hidden lg:block cho Desktop và block lg:hidden cho Mobile). Tuyệt đối không để tồn tại các nút bấm chuyển đổi Viewport thủ công (như nút giả lập điện thoại hay switcher) trên bản phát hành chính thức.',
    badCode: 'Để các nút bấm gạt AUTO / DESKTOP / MOBILE lơ lửng trên giao diện người dùng thực.',
    goodCode: 'CSS thuần tự nhận diện màn hình, tải đúng phân hệ DesktopView hoặc MobileView tức thì không giật layout.',
  },
  {
    ruleNumber: 14,
    name: 'UNIVERSAL_COMPONENT_DARK_MODE_INVERSION',
    title: 'Kỷ Luật Đa Tầng Dark Mode Sâu Tuyệt Đối (Deep OLED Architecture)',
    description: 
      'Khi chuyển sang Dark Mode, toàn bộ mọi linh kiện (Card, Input, Button, Tabs, Accordion, SelectPicker, Switch, Dialog, Drawer, Toast, Skeleton, Terminal) bắt buộc phải tuân thủ kiến trúc phân tầng bóng đêm sâu thẳm: (1) Canvas nền đen OLED nguyên bản (#000000). (2) Bề mặt linh kiện phân tầng có chiều sâu (#0E0E10 cho Card chính, #18181B cho Sub-panel, #27272A cho phần tử điều khiển). (3) Đường viền phân cách bằng mực sáng crisp (Zinc-300 / Zinc-400 hoặc Viền Đen ngăn cách trên các nút bấm màu bão hòa). (4) Bóng đổ sử dụng các dải Cyber Neon tương phản cao (#FFE600, #00F0FF, #FF007A, #00FF7F). TUYỆT ĐỐI CẤM dùng viền trắng (#FFF) đi kèm bóng trắng (#FFF) vì sẽ dính liền thành một khối viền méo mó dày cộm 8px-10px. (5) Header ban đêm chuyển sang tone Nocturnal trầm tối (#09090B) để bảo vệ mắt người dùng.',
    badCode: 'Dùng dark:border-white kết hợp dark:shadow-[..._#FFF] khiến viền và bóng đổ dính liền thành cục trắng dày 8px méo mó; hoặc giữ nguyên header màu vàng chói lóa ban đêm.',
    goodCode: 'bg-white dark:bg-[#0E0E10] border-black dark:border-zinc-300 shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFE600] text-black dark:text-white',
  },
  {
    ruleNumber: 15,
    name: 'WEB_MOBILE_SOVEREIGNTY',
    title: 'Kỷ Luật Web Di Động Thuần Túy - Chống Ngụy Tạo Mobile App',
    description: 
      'Giao diện Web Mobile phải tôn trọng bản chất của nền tảng Web: (1) Cấm giả lập thanh trạng thái điện thoại (09:41 5G 100%) vì hệ điều hành máy thật đã có. (2) Cấm cưỡng ép thanh điều hướng cố định dưới đáy (Bottom Toolbar Dock) kiểu Native App đối với các trang thông tin/portfolio không phải PWA, nhằm triệt tiêu lỗi chạm nhầm thanh Safari, lỗi double-tap và che khuất diện tích đọc. (3) Bố cục theo luồng Web tự nhiên, giữ không gian cuộn dọc thông thoáng.',
    badCode: 'Đặt thanh 5 nút fixed dưới đáy màn hình web mobile gây xung đột với Safari URL bar và che mất 15% diện tích đọc.',
    goodCode: 'Bỏ Bottom Toolbar cố định, kết hợp Bento Navigation Grid đầu trang và Ark UI Menu Drawer khi cần chuyển phân hệ.',
  },
  {
    ruleNumber: 16,
    name: 'FIT_ON_SCREEN_BEHAVIOR_LAW',
    title: 'Kỷ Luật Mọi Nút Bấm & Hành Vi Luôn Hiển Thị Trên Màn Hình (Cấm Cuộn Ngang)',
    description: 
      'Mọi nút bấm (action buttons), thanh điều hướng tính năng, các lựa chọn behavior trên di động PHẢI luôn luôn hiển thị trọn vẹn 100% trong khung nhìn màn hình (Fit-On-Screen). Tuyệt đối cấm sử dụng cuộn ngang (overflow-x-auto hay horizontal carousel) cho danh sách tính năng cốt lõi vì làm ẩn đi 40-60% chức năng khỏi tầm mắt người dùng và gây thao tác vuốt trượt ngang khó khăn. Thay vào đó, bắt buộc sử dụng bố cục Bento Grid đa hàng (ví dụ: lưới 2 hàng [2 cột + 3 cột] hoặc lưới co giãn đều) để người dùng bao quát và chạm tức thì vào mọi chức năng chỉ trong 1 ánh nhìn.',
    badCode: '<div class="overflow-x-auto whitespace-nowrap">...</div> giấu nút ARENA và WORDS ra ngoài mép màn hình, bắt người dùng phải cuộn ngang mò mẫm.',
    goodCode: '<div class="grid grid-cols-2 gap-2 mb-2">...</div><div class="grid grid-cols-3 gap-2">...</div> hiển thị trọn vẹn 5 tính năng tức thì trên mọi màn hình từ 375px-390px.',
  },
  {
    ruleNumber: 17,
    name: 'VIETNAMESE_DIACRITIC_BREATHING_LAW',
    title: 'Kỷ Luật Khoảng Thở Dấu Tiếng Việt & Chống Chèn Đè Băng Chữ',
    description: 
      'Chữ tiếng Việt viết hoa có hệ thống dấu thanh đôi bên trên (Ấ, Ắ, Ẩ, Ế, Ố, Ớ, Ễ, Ữ) và dấu nặng/móc bên dưới (Ặ, Ệ, Ộ, Ự). TUYỆT ĐỐI CẤM dùng leading-[0.xx] hoặc leading-none trên các tiêu đề tiếng Việt nhiều dòng, vì dấu của dòng dưới sẽ chèn đè trực tiếp lên chân chữ dòng trên. Mọi heading và tiêu đề tiếng Việt bắt buộc line-height tối thiểu 1.25 đến 1.35 (leading-[1.25] hoặc leading-snug), và tracking không được co quá -0.01em.',
    badCode: '<h1 class="text-6xl uppercase leading-[0.96] tracking-tight">KIẾN TRÚC HỆ THỐNG</h1> khiến dấu Ố của dòng 2 chèn thẳng vào chân chữ Ệ của dòng 1.',
    goodCode: '<h1 class="text-2xl sm:text-5xl lg:text-7xl uppercase leading-[1.28] tracking-normal break-words">KIẾN TRÚC HỆ THỐNG</h1> bảo đảm khoảng thở thoáng đãng, dấu thanh không bao giờ chạm nhau.',
  },
  {
    ruleNumber: 18,
    name: 'ZERO_VIEWPORT_OVERFLOW_LAW',
    title: 'Kỷ Luật Chống Tràn Mép Màn Hình Di Động (Zero Horizontal Blowout)',
    description: 
      'Mọi khối nội dung, tiêu đề lớn, huy hiệu và thẻ gắn nhãn inline-block trên di động PHẢI tự động co giãn theo chiều rộng màn hình, không bao giờ được đẩy phình khung chứa vượt quá 100vw làm mất viền hoặc phát sinh thanh cuộn ngang ngoài ý muốn. Mọi khối văn bản lớn phải có break-words, max-w-full; các span inline-block phải có padding dọc/ngang cân đối và line-height tự co giãn; các container gốc phải có overflow-x-hidden.',
    badCode: '<h1 class="text-4xl"><span class="inline-block px-2">THỰC CHIẾN GỐC RỄ.</span></h1> trên màn hình 375px làm tiêu đề phình rộng 440px đẩy viền trang bay ra khỏi mép phải màn hình.',
    goodCode: '<h1 class="text-2xl sm:text-5xl break-words max-w-full"><span class="inline-block max-w-full break-words px-2.5 py-1 leading-snug">THỰC CHIẾN GỐC RỄ.</span></h1> co giãn hoàn hảo trong khung nhìn.',
  },
  {
    ruleNumber: 19,
    name: 'FEEDBACK_VISIBILITY_AND_TOP_TOAST_LAW',
    title: 'Kỷ Luật Tương Phản Loader Dark Mode & Neo Đỉnh Cho Toast Di Động',
    description: 
      'Các linh kiện phản hồi trạng thái (Feedback UI) phải đảm bảo khả năng nhận diện thị giác tức thời: (1) Thanh tiến trình Loader/Progress trong Dark Mode PHẢI giữ nguyên màu pigment neon gốc (#FFE600, #00F0FF, #FF007A) kết hợp lớp vân sọc cơ học bán trong suốt rgba(0,0,0,0.42), rãnh chạy (track) đặt màu trầm phân tầng (#18181B) để người dùng thấy rõ độ đầy %. Cấm để fill bar màu đen trên nền đen làm tàng hình tiến trình. Khung xương (Skeleton) phải nổi rõ sọc chuyển động tương phản. (2) Thông báo Toast trên Web Mobile PHẢI neo ở đỉnh màn hình (top-4 left-4 right-4) chuẩn Dynamic Island/Push Banner, tuyệt đối không đặt đáy màn hình vì xung đột ngón cái cuộn trang và thanh URL của trình duyệt di động.',
    badCode: '<div style="background-image: repeating-linear-gradient(... #000 ...)"> làm tiến trình đen xì chìm vào nền tối; đặt Toast fixed bottom-6 trên mobile bị thanh Safari che mất.',
    goodCode: 'background-color: #FFE600 với lớp sọc rgba(0,0,0,0.42) trên track #18181B; Toast neo top-4 left-4 right-4 lướt từ trên xuống trực quan.',
  },
  {
    ruleNumber: 20,
    name: 'ZERO_MOBILE_INPUT_AUTO_ZOOM_LAW',
    title: 'Kỷ Luật Triệt Tiêu Phóng To Màn Hình Khi Chạm Ô Nhập Liệu (Zero Mobile Auto-Zoom)',
    description: 
      'Trên hệ điều hành di động (đặc biệt là iOS Safari và WebKit), trình duyệt sẽ TỰ ĐỘNG CƯỠNG CHẾ PHÓNG TO (Auto-Zoom) toàn bộ khung nhìn trang web mỗi khi người dùng chạm focus vào bất kỳ ô nhập liệu (input, select, textarea) có cỡ chữ (font-size) nhỏ hơn 16px (1rem). Hiện tượng này làm bể bố cục, dịch chuyển khung nhìn và gây mất phương hướng nghiêm trọng. BẮT BUỘC: (1) Mọi thẻ input, select, textarea trên màn hình di động (< 768px) phải có font-size tối thiểu 16px (text-base hoặc CSS global rule font-size: 16px !important). (2) Thẻ viewport trong index.html phải khai báo đầy đủ maximum-scale=1.0, user-scalable=no, viewport-fit=cover. (3) Bổ sung touch-action: manipulation trên toàn bộ nút bấm và ô nhập liệu để triệt tiêu độ trễ 300ms và chặn phóng to kép (double-tap zoom).',
    badCode: '<input class="text-xs" ... /> (font 12px) khiến iOS Safari tự động phóng to 133% làm méo mó toàn bộ trang web khi người dùng gõ lệnh.',
    goodCode: 'CSS global @media (max-width: 767px) { input, select, textarea { font-size: 16px !important; } } kết hợp viewport chuẩn khóa phóng to ngoài ý muốn.',
  },
] as const;

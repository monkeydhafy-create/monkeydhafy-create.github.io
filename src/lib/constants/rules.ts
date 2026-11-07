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
    title: 'Kỷ Luật Chuyển Đổi Dark Mode Toàn Diện Mọi Linh Kiện',
    description: 
      'Khi chuyển sang Dark Mode, toàn bộ mọi linh kiện (Card, Input, Button, Tabs, Accordion, SelectPicker, Switch, Dialog, Drawer, Toast, Skeleton, Navigation Dock) bắt buộc phải đồng loạt chuyển đổi trạng thái hình học: (1) Viền mực đen (#000000) biến thành Viền trắng tinh khôi (#FFFFFF) hoặc viền neon. (2) Bóng đổ cứng đen (#000000) biến thành Bóng đổ cứng trắng (#FFFFFF) hoặc neon (#00F0FF, #FFE600). (3) Bề mặt linh kiện biến thành Charcoal sâu (#141414, #181818, #1C1C1C) - tuyệt đối không để màu trắng nguyên bản và không dùng màu đen hòa tan với nền (#000000) để đảm bảo độ sâu 3D. Tuyệt đối cấm chỉ đổi nền hoặc màu chữ mà giữ nguyên viền đen/bóng đen của linh kiện.',
    badCode: 'Chỉ thêm dark:bg-black ở thẻ body, giữ nguyên card có shadow-[4px_4px_0px_#000] khiến bóng đen tàng hình trên nền đen.',
    goodCode: 'bg-white dark:bg-[#141414] border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#FFF]',
  },
  {
    ruleNumber: 15,
    name: 'WEB_MOBILE_SOVEREIGNTY',
    title: 'Kỷ Luật Web Di Động Thuần Túy - Chống Ngụy Tạo Mobile App',
    description: 
      'Giao diện Web Mobile phải tôn trọng bản chất của nền tảng Web: (1) Cấm giả lập thanh trạng thái điện thoại (09:41 5G 100%) vì hệ điều hành máy thật đã có. (2) Cấm cưỡng ép thanh điều hướng cố định dưới đáy (Bottom Toolbar Dock) kiểu Native App đối với các trang thông tin/portfolio không phải PWA, nhằm triệt tiêu lỗi chạm nhầm thanh Safari, lỗi double-tap và che khuất diện tích đọc. (3) Sử dụng điều hướng Tab đầu trang (Top Scrollable Tabs) hoặc Menu Drawer kết hợp cuộn tự nhiên theo chuẩn mực Web.',
    badCode: 'Đặt thanh 5 nút fixed dưới đáy màn hình web mobile gây xung đột với Safari URL bar và che mất 15% diện tích đọc.',
    goodCode: 'Bỏ Bottom Dock, sử dụng Web Tabs cuộn ngang ở đỉnh trang kết hợp Ark UI Menu Drawer khi cần chuyển phân hệ.',
  },
] as const;

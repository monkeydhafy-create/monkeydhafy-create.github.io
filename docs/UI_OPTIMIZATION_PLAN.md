# UI Optimization Plan (engbbq.me)

## Nguồn tham khảo cộng đồng
- Scroll lock: `scrollbar-gutter: stable` + `overflow:hidden` trên `<html>` (web.dev / CSS-Tricks / dulan.me); bỏ `touch-action:none` trên body vì gây khựng cuộn iOS.
- Neo-brutalism dark: viền + bóng offset trắng, không blur (Gumroad / Neobrutalism.dev).
- Tiếng Việt: dùng Be Vietnam Pro, line-height >= 1.15 cho heading uppercase.

## Đã làm
| Hạng mục | Giải pháp |
|---|---|
| Layout giật khi mở dialog | `html{scrollbar-gutter:stable}` + `.nb-scroll-locked`, util ref-count `src/lib/utils/scrollLock.ts` |
| Giật do render | Bỏ `backdrop-blur` và `transition-all` trên dialog |
| Esc đóng dialog | `svelte:window` keydown |
| Dark mode | Toàn bộ `dark:shadow` = `#FFFFFF`, `dark:border` = trắng (0 shadow màu còn sót, đã kiểm bằng computed style) |
| Dấu tiếng Việt | Be Vietnam Pro, `leading-snug`, padding-top heading |

## Còn lại (đề xuất)
1. Gom class lặp trong view vào token/`COMPONENT_COLORS` (hiện nhiều class inline).
2. Focus trap + trả focus cho dialog (a11y).
3. `prefers-color-scheme` + lưu theme vào localStorage, tránh flash.
4. `prefers-reduced-motion` cho animation.
5. Test visual regression (Playwright snapshot) cho light/dark.

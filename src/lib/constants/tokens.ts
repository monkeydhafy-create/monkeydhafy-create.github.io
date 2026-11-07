/**
 * ============================================================================
 * HYPER NEO-BRUTALISM × ARK UI DESIGN SYSTEM TOKENS
 * ============================================================================
 * Standard: ISO-NEO-BRUTALISM-2026.04
 * Scope: Light Mode & Dark Mode Exhaustive Constant Architecture
 * 
 * All components, layouts, typography, borders, shadows, and transitions
 * MUST strictly import and consume these tokens. Arbitrary magic values are prohibited.
 */

export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

// ============================================================================
// 1. SPATIAL CADENCE & 8-POINT GRID (Không gian & Lưới)
// ============================================================================
export const SPACING = {
  0: '0px',
  1: '4px',       // 0.25rem - Micro spacing (between icon and text)
  2: '8px',       // 0.50rem - Baseline unit
  3: '12px',      // 0.75rem - Tight inner padding
  4: '16px',      // 1.00rem - Standard component inner padding
  5: '20px',      // 1.25rem - Card padding standard
  6: '24px',      // 1.50rem - Grid gutter standard
  8: '32px',      // 2.00rem - Section header spacing
  10: '40px',     // 2.50rem - Large component padding
  12: '48px',     // 3.00rem - Major content section separation
  16: '64px',     // 4.00rem - Hero block vertical padding
  20: '80px',     // 5.00rem - Page level separation
  24: '96px',     // 6.00rem - Masthead spacing
  32: '128px',    // 8.00rem - Maximum breathing room
} as const;

export type SpacingToken = keyof typeof SPACING;

// ============================================================================
// 2. BORDER STROKES & LINE WEIGHTS (Độ dày viền mực đen/trắng)
// ============================================================================
export const BORDERS = {
  none: '0px',
  hairline: '1.5px', // Auxiliary dividers, nested badges
  thin: '2px',       // Subtle inner boundaries
  medium: '3px',     // Standard input borders, secondary buttons
  thick: '4px',      // Radical Primary Component Stroke (Buttons, Cards)
  heavy: '5px',      // Hero blocks, Top mastheads, Modals
  epic: '6px',       // Screen boundary frame
} as const;

export const BORDER_STYLES = {
  solid: 'solid',
  dashed: 'dashed',  // Drag and drop areas, empty states
  dotted: 'dotted',  // Monospace code divider boundaries
} as const;

// ============================================================================
// 3. HARD OFFSET DROP SHADOWS (Bóng cứng không làm mờ - Zero Blur)
// ============================================================================
export const SHADOWS = {
  light: {
    level0: '0px 0px 0px #000000',           // Active / pressed flat on floor
    level1: '2px 2px 0px #000000',           // Small badges, micro pills
    level2: '4px 4px 0px #000000',           // Standard buttons, inputs, tabs
    level3: '6px 6px 0px #000000',           // Cards, Accordions, Dropdown menus
    level4: '8px 8px 0px #000000',           // Sticker callouts, Elevated tiles
    level5: '12px 12px 0px #000000',         // Floating dialogs, drawers, popovers
    level6: '16px 16px 0px #000000',         // Main workspace container, epic hero
  },
  dark: {
    // In Dark Mode, hard shadows use high-contrast crisp white or electric accents
    level0: '0px 0px 0px rgba(0, 0, 0, 0)',
    level1: '2px 2px 0px #FFFFFF',
    level2: '4px 4px 0px #FFFFFF',
    level3: '6px 6px 0px #FFFFFF',
    level4: '8px 8px 0px #FFFFFF',
    level5: '12px 12px 0px #FFFFFF',
    level6: '16px 16px 0px #FFFFFF',
    // Neon Electric Variants for Cyber-Brutalism
    cyan: '6px 6px 0px #00F0FF',
    magenta: '6px 6px 0px #FF007A',
    lime: '6px 6px 0px #00FF66',
    yellow: '6px 6px 0px #FFE600',
  }
} as const;

// ============================================================================
// 4. COLOR PALETTE MATRIX (Hệ màu Light Mode vs Dark Mode chi tiết)
// ============================================================================
export const COLORS = {
  light: {
    // Canvas & Surrounding Backgrounds
    canvasBase: '#FFFDEB',        // Retro warm cream background
    canvasDot: '#000000',         // Radial background dot grid
    surfacePrimary: '#FFFFFF',    // Crisp white card surface
    surfaceWarm: '#FFFDF0',       // Soft ivory secondary background
    surfaceMuted: '#F4F4EE',      // Muted table header / inactive tabs

    // Inks & Typography
    inkRadical: '#000000',        // Pure pitch black for headlines & primary text
    inkMuted: '#333333',          // High readability secondary text (WCAG AAA)
    inkSubtle: '#666666',         // Metadata, timestamp, line numbers

    // Structural Borders
    borderRadical: '#000000',     // 4px radical boundary stroke
    borderSubtle: '#444444',      // Secondary hairline borders

    // Vivid Neo-Brutalist Pop Pigments (Light Mode)
    yellow: '#FFE600',            // Acid Yellow (Primary CTA & Warning)
    magenta: '#FF007A',           // Hot Electric Magenta (Urgent / Active / Heart)
    lime: '#00FF66',              // Cyber Lime (Success / Ready / Verified)
    cyan: '#00F0FF',              // Electric Cyan (Focus / Information / Active Tab)
    purple: '#7928CA',            // Deep Violet (Knowledge / Special Vector)
    orange: '#FF5C00',            // Flame Orange (Streak / Fire / Highlight)

    // Functional State Colors
    stateHoverBg: '#FFE600',      // Yellow inversion on button hover
    stateActiveBg: '#00F0FF',     // Cyan on active click
    stateDisabledBg: '#E5E5DE',   // Grayed out disabled surface
    stateDisabledInk: '#888888',  // Disabled text
  },
  dark: {
    // Canvas & Surrounding Backgrounds (Cyber-Brutalist OLED)
    canvasBase: '#080808',        // Pure OLED deep pitch black
    canvasDot: '#333333',         // Subtle dot matrix grid
    surfacePrimary: '#141414',    // Dark charcoal primary card surface
    surfaceWarm: '#1C1C1C',       // Elevated surface
    surfaceMuted: '#242424',      // Muted inactive tab background

    // Inks & Typography
    inkRadical: '#FFFFFF',        // Pure crisp white for all headlines
    inkMuted: '#D4D4D4',          // High contrast light gray secondary text
    inkSubtle: '#888888',         // Metadata, timestamp, code annotations

    // Structural Borders
    borderRadical: '#FFFFFF',     // 4px crisp white boundary stroke
    borderSubtle: '#555555',      // Secondary hairline borders

    // Vivid Neo-Brutalist Pop Pigments (Dark Mode - Nocturnal Deep Tones & Laser Inks)
    yellow: '#FFE600',            // Acid Yellow Laser Ink
    yellowDarkBg: '#1C1900',      // Deep Obsidian Amber (Non-glaring Dark Button/Badge surface)
    magenta: '#FF1A8C',           // Electric Hot Pink Laser Ink
    magentaDarkBg: '#200412',     // Deep Obsidian Magenta surface
    lime: '#00FF7F',              // Vibrant Spring Green Laser Ink
    limeDarkBg: '#04200E',        // Deep Obsidian Forest surface
    cyan: '#00F0FF',              // Hyper Cyan Laser Ink
    cyanDarkBg: '#031C20',        // Deep Obsidian Teal surface
    purple: '#A855F7',            // Electric Violet Laser Ink
    purpleDarkBg: '#190529',      // Deep Obsidian Violet surface
    orange: '#FF6B00',            // Radiant Orange Laser Ink
    orangeDarkBg: '#240A00',      // Deep Obsidian Ember surface

    // Functional State Colors
    stateHoverBg: '#FFE600',      // High contrast yellow on hover
    stateActiveBg: '#00F0FF',     // Cyan on active click
    stateDisabledBg: '#1C1C20',   // Dimmed disabled surface
    stateDisabledInk: '#52525B',  // Disabled text
  }
} as const;

// ============================================================================
// 4.1. COMPONENT-SPECIFIC THEME PALETTES (Light vs Deep Dark Mode)
// ============================================================================
export const COMPONENT_COLORS = {
  light: {
    buttonPrimary: {
      bg: 'bg-[#FFE600]',
      text: 'text-black',
      border: 'border-black',
      hover: 'hover:bg-[#FFF066]',
      shadow: 'shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]',
    },
    buttonSecondary: {
      bg: 'bg-[#00F0FF]',
      text: 'text-black',
      border: 'border-black',
      hover: 'hover:bg-[#66F5FF]',
      shadow: 'shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]',
    },
    buttonDanger: {
      bg: 'bg-[#FF007A]',
      text: 'text-white',
      border: 'border-black',
      hover: 'hover:bg-[#FF3399]',
      shadow: 'shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]',
    },
    buttonOutline: {
      bg: 'bg-white',
      text: 'text-black',
      border: 'border-black',
      hover: 'hover:bg-neutral-100',
      shadow: 'shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]',
    },
    buttonDark: {
      bg: 'bg-black',
      text: 'text-white',
      border: 'border-black',
      hover: 'hover:bg-neutral-800',
      shadow: 'shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]',
    },
    badge: {
      yellow: 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_#000]',
      cyan: 'bg-[#00F0FF] text-black border-black shadow-[2px_2px_0px_#000]',
      magenta: 'bg-[#FF007A] text-white border-black shadow-[2px_2px_0px_#000]',
      lime: 'bg-[#00FF66] text-black border-black shadow-[2px_2px_0px_#000]',
      purple: 'bg-[#7928CA] text-white border-black shadow-[2px_2px_0px_#000]',
      orange: 'bg-[#FF5C00] text-white border-black shadow-[2px_2px_0px_#000]',
      neutral: 'bg-neutral-200 text-black border-black shadow-[2px_2px_0px_#000]',
    },
    card: {
      bg: 'bg-white',
      border: 'border-black',
      subBg: 'bg-[#FFFDF0]',
      shadow: 'shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000]',
    },
    toast: {
      success: {
        bg: 'bg-[#00FF66]',
        text: 'text-black',
        border: 'border-black',
        shadow: 'shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000]',
        icon: '✔'
      },
      warning: {
        bg: 'bg-[#FFE600]',
        text: 'text-black',
        border: 'border-black',
        shadow: 'shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000]',
        icon: '⚠'
      },
      error: {
        bg: 'bg-[#FF007A]',
        text: 'text-white',
        border: 'border-black',
        shadow: 'shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000]',
        icon: '✖'
      },
      info: {
        bg: 'bg-[#00F0FF]',
        text: 'text-black',
        border: 'border-black',
        shadow: 'shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000]',
        icon: 'ℹ'
      },
    },
    tabs: {
      container: 'border-[3px] md:border-[4px] border-black bg-neutral-100 shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]',
      tabActive: 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_#000] -translate-y-0.5',
      tabInactive: 'text-neutral-600 hover:text-black hover:bg-neutral-200',
    },
    input: {
      container: 'border-[2.5px] md:border-[3px] border-black shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] bg-white',
      prefix: 'bg-[#FFE600] text-black border-r-[2.5px] md:border-r-[3px] border-black',
      field: 'text-black placeholder:text-neutral-400',
    },
    select: {
      trigger: 'bg-white text-black border-[2.5px] md:border-[3px] border-black shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]',
      arrow: 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_#000]',
      menu: 'bg-white border-t-[3px] md:border-[3px] border-black shadow-[0px_-4px_0px_#000] md:shadow-[6px_6px_0px_#000]',
      optionActive: 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_#000]',
      optionInactive: 'hover:bg-neutral-100 text-black',
    },
    switch: {
      track: 'border-[3px] border-black shadow-[2px_2px_0px_#000]',
      trackActive: 'bg-[#00FF66]',
      trackInactive: 'bg-neutral-300',
      knobActive: 'bg-black text-white shadow-[1px_1px_0px_#000]',
      knobInactive: 'bg-neutral-600 text-white',
    },
    accordion: {
      headerOpen: 'bg-[#00F0FF] text-black',
      headerClosed: 'bg-white text-black hover:bg-[#FFE600] hover:text-black',
      indicatorOpen: 'rotate-45 bg-[#FFE600] text-black',
      indicatorClosed: 'rotate-0',
    },
    banner: {
      bg: 'bg-[#FFE600]',
      text: 'text-black',
      border: 'border-black',
      ctaBtn: 'bg-black text-white hover:bg-neutral-800 shadow-[4px_4px_0px_#000]',
    },
    header: {
      bar: 'border-b-[3px] md:border-b-[4px] border-black bg-white text-black',
      logoBox: 'bg-[#FF007A] text-white border-r-[3px] md:border-r-[4px] border-black',
      navActive: 'bg-[#FFE600] text-black border border-black shadow-[1.5px_1.5px_0px_#000]',
      navInactive: 'text-neutral-700 hover:text-black hover:bg-neutral-200',
    },
    modal: {
      header: 'bg-[#FFE600] text-black border-b-[3px] md:border-b-[4px] border-black',
      closeBtn: 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]',
      container: 'bg-white text-black border-t-[3px] md:border-[4px] border-black shadow-[12px_12px_0px_#000]',
    }
  },
  dark: {
    buttonPrimary: {
      bg: 'dark:bg-[#FFE600]',
      text: 'dark:text-black',
      border: 'dark:border-white',
      hover: 'dark:hover:bg-[#FFF066] dark:hover:text-black dark:hover:shadow-[1px_1px_0px_#FFFFFF]',
      shadow: 'dark:shadow-[3px_3px_0px_#FFFFFF] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    },
    buttonSecondary: {
      bg: 'dark:bg-[#00F0FF]',
      text: 'dark:text-black',
      border: 'dark:border-white',
      hover: 'dark:hover:bg-[#66F5FF] dark:hover:text-black dark:hover:shadow-[1px_1px_0px_#FFFFFF]',
      shadow: 'dark:shadow-[3px_3px_0px_#FFFFFF] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    },
    buttonDanger: {
      bg: 'dark:bg-[#FF007A]',
      text: 'dark:text-white',
      border: 'dark:border-white',
      hover: 'dark:hover:bg-[#FF3399] dark:hover:text-white dark:hover:shadow-[1px_1px_0px_#FFFFFF]',
      shadow: 'dark:shadow-[3px_3px_0px_#FFFFFF] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    },
    buttonOutline: {
      bg: 'dark:bg-[#18181B]',
      text: 'dark:text-white',
      border: 'dark:border-white',
      hover: 'dark:hover:bg-[#27272A] dark:hover:text-white dark:hover:shadow-[1px_1px_0px_#FFFFFF]',
      shadow: 'dark:shadow-[3px_3px_0px_#FFFFFF] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    },
    buttonDark: {
      bg: 'dark:bg-[#27272A]',
      text: 'dark:text-white',
      border: 'dark:border-white',
      hover: 'dark:hover:bg-zinc-700 dark:hover:shadow-[1px_1px_0px_#FFFFFF]',
      shadow: 'dark:shadow-[3px_3px_0px_#FFFFFF] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
    },
    badge: {
      yellow: 'dark:bg-[#FFE600] dark:text-black dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      cyan: 'dark:bg-[#00F0FF] dark:text-black dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      magenta: 'dark:bg-[#FF007A] dark:text-white dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      lime: 'dark:bg-[#00FF66] dark:text-black dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      purple: 'dark:bg-[#7928CA] dark:text-white dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      orange: 'dark:bg-[#FF5C00] dark:text-white dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      neutral: 'dark:bg-[#27272A] dark:text-white dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
    },
    card: {
      bg: 'dark:bg-[#0E0E10]',
      border: 'dark:border-white',
      subBg: 'dark:bg-[#18181B]',
      shadow: 'dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
    },
    toast: {
      success: {
        bg: 'dark:bg-[#00FF66]',
        text: 'dark:text-black',
        border: 'dark:border-white',
        shadow: 'dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
        icon: '✔'
      },
      warning: {
        bg: 'dark:bg-[#FFE600]',
        text: 'dark:text-black',
        border: 'dark:border-white',
        shadow: 'dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
        icon: '⚠'
      },
      error: {
        bg: 'dark:bg-[#FF007A]',
        text: 'dark:text-white',
        border: 'dark:border-white',
        shadow: 'dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
        icon: '✖'
      },
      info: {
        bg: 'dark:bg-[#00F0FF]',
        text: 'dark:text-black',
        border: 'dark:border-white',
        shadow: 'dark:shadow-[4px_4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
        icon: 'ℹ'
      },
    },
    tabs: {
      container: 'dark:border-white dark:bg-[#18181B] dark:shadow-[3px_3px_0px_#FFFFFF] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
      tabActive: 'dark:bg-[#FFE600] dark:text-black dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF] -translate-y-0.5',
      tabInactive: 'dark:text-zinc-300 dark:hover:text-white dark:hover:bg-[#27272A]',
    },
    input: {
      container: 'dark:border-white dark:shadow-[3px_3px_0px_#FFFFFF] md:dark:shadow-[4px_4px_0px_#FFFFFF] dark:bg-[#121214]',
      prefix: 'dark:bg-[#FFE600] dark:text-black dark:border-r-white',
      field: 'dark:text-white dark:placeholder:text-zinc-500',
    },
    select: {
      trigger: 'dark:bg-[#121214] dark:text-white dark:border-white dark:shadow-[3px_3px_0px_#FFFFFF] md:dark:shadow-[4px_4px_0px_#FFFFFF]',
      arrow: 'dark:bg-[#FFE600] dark:text-black dark:border-white dark:shadow-[1px_1px_0px_#FFFFFF]',
      menu: 'dark:bg-[#121214] dark:border-white dark:shadow-[0px_-4px_0px_#FFFFFF] md:dark:shadow-[6px_6px_0px_#FFFFFF]',
      optionActive: 'dark:bg-[#FFE600] dark:text-black dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      optionInactive: 'dark:hover:bg-[#27272A] dark:text-white',
    },
    switch: {
      track: 'dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      trackActive: 'dark:bg-[#00FF66] dark:border-white',
      trackInactive: 'dark:bg-[#18181B]',
      knobActive: 'dark:bg-black dark:text-white dark:shadow-[1px_1px_0px_#FFFFFF]',
      knobInactive: 'dark:bg-zinc-500 dark:text-white',
    },
    accordion: {
      headerOpen: 'dark:bg-[#00F0FF] dark:text-black dark:border-white',
      headerClosed: 'dark:bg-[#0E0E10] dark:text-white dark:hover:bg-[#FFE600] dark:hover:text-black',
      indicatorOpen: 'rotate-45 dark:bg-[#FFE600] dark:text-black dark:border-white',
      indicatorClosed: 'rotate-0',
    },
    banner: {
      bg: 'dark:bg-[#141416]',
      text: 'dark:text-white',
      border: 'dark:border-white',
      ctaBtn: 'dark:bg-[#FFE600] dark:text-black dark:border-2 dark:border-white dark:shadow-[4px_4px_0px_#FFFFFF] dark:hover:bg-[#FFF066]',
    },
    header: {
      bar: 'dark:border-white dark:bg-[#09090B] dark:text-white',
      logoBox: 'dark:bg-[#FF007A] dark:text-white dark:border-white',
      navActive: 'dark:bg-[#FFE600] dark:text-black dark:border-white dark:shadow-[1.5px_1.5px_0px_#FFFFFF]',
      navInactive: 'dark:text-zinc-300 dark:hover:text-white dark:hover:bg-[#27272A]',
    },
    modal: {
      header: 'dark:bg-[#FFE600] dark:text-black dark:border-white',
      closeBtn: 'dark:bg-white dark:text-black dark:border-white dark:shadow-[2px_2px_0px_#FFFFFF]',
      container: 'dark:bg-[#0E0E10] dark:text-white dark:border-white dark:shadow-[12px_12px_0px_#FFFFFF]',
    }
  }
} as const;

// ============================================================================
// 5. TYPOGRAPHY MATRIX (Hệ thống kiểu chữ & nhịp điệu đọc)
// ============================================================================
export const FONTS = {
  sans: "'Be Vietnam Pro', 'Space Grotesk', 'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  display: "'Be Vietnam Pro', 'Space Grotesk', sans-serif",
} as const;

export const TYPE_SCALE = {
  displayMammoth: {
    fontSize: '60px',
    lineHeight: '1.1',
    letterSpacing: '-0.04em',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
  },
  displayLarge: {
    fontSize: '44px',
    lineHeight: '1.15',
    letterSpacing: '-0.03em',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
  },
  displayMedium: {
    fontSize: '32px',
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
  },
  heading1: {
    fontSize: '26px',
    lineHeight: '1.25',
    letterSpacing: '-0.01em',
    fontWeight: '800',
  },
  heading2: {
    fontSize: '20px',
    lineHeight: '1.3',
    letterSpacing: '0.0em',
    fontWeight: '700',
  },
  heading3: {
    fontSize: '16px',
    lineHeight: '1.35',
    letterSpacing: '0.0em',
    fontWeight: '700',
  },
  bodyLarge: {
    fontSize: '16px',
    lineHeight: '1.6',
    letterSpacing: '-0.01em',
    fontWeight: '500',
  },
  bodyStandard: {
    fontSize: '14px',
    lineHeight: '1.5',
    letterSpacing: '0.0em',
    fontWeight: '500',
  },
  bodySmall: {
    fontSize: '12px',
    lineHeight: '1.45',
    letterSpacing: '0.0em',
    fontWeight: '500',
  },
  monoLabelLarge: {
    fontFamily: FONTS.mono,
    fontSize: '13px',
    lineHeight: '1.3',
    letterSpacing: '0.06em',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
  },
  monoLabelStandard: {
    fontFamily: FONTS.mono,
    fontSize: '11px',
    lineHeight: '1.2',
    letterSpacing: '0.08em',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
  },
  monoLabelMicro: {
    fontFamily: FONTS.mono,
    fontSize: '9px',
    lineHeight: '1.1',
    letterSpacing: '0.10em',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
  },
} as const;

// ============================================================================
// 6. RADII / CORNERS (Quy chuẩn bo góc: Tuyệt đối sắc cạnh hoặc bo nhẹ 4px)
// ============================================================================
export const RADII = {
  none: '0px',    // Radical Brutalism default (100% sharp corners)
  micro: '2px',   // Slightly softened corner for small pills
  punchy: '4px',  // Friendly Neo-Brutalist button radius
  pill: '9999px', // Circular status indicator dots & round badges only
} as const;

// ============================================================================
// 7. BEHAVIOR & INTERACTION CONSTANTS (Tương tác cơ học chuẩn xác)
// ============================================================================
export const TRANSITIONS = {
  instant: '80ms',
  snappy: '120ms',
  standard: '160ms',
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // Rapid acceleration + sharp stop
  linear: 'linear',                       // For marquee tickers
} as const;

export const TACTILE_OFFSETS = {
  default: 'translate(0px, 0px)',
  hover: 'translate(2px, 2px)',           // Partial depress
  active: 'translate(6px, 6px)',          // Full depress onto floor
  elevatedHover: 'translate(-2px, -2px)', // Pop upwards
} as const;

// ============================================================================
// 8. Z-INDEX LAYERING SPECIFICATION (Tầng hiển thị Ark UI)
// ============================================================================
export const Z_INDEX = {
  base: 0,
  card: 10,
  stickerBadge: 20,
  stickyHeader: 50,
  marqueeTicker: 60,
  dropdownPopover: 100, // Ark UI Popover / Menu
  modalBackdrop: 200,   // Ark UI Dialog Backdrop
  modalContent: 210,    // Ark UI Dialog Content
  toastNotification: 300,
  tooltip: 400,
} as const;

// ============================================================================
// 9. STICKER ROTATION ANGLES (Góc nghiêng huy hiệu Pop-Art)
// ============================================================================
export const ROTATIONS = {
  tiltLeftSmall: 'rotate(-2deg)',
  tiltRightSmall: 'rotate(2deg)',
  tiltLeftHard: 'rotate(-4deg)',
  tiltRightHard: 'rotate(4deg)',
} as const;

// ============================================================================
// 10. MOBILE-SPECIFIC ADAPTATIONS & TOUCH ERGONOMICS (Đặc thù Mobile)
// ============================================================================
export const MOBILE_BREAKPOINTS = {
  compact: '360px', // Small Android devices
  standard: '390px', // iPhone 14/15/16 standard
  plus: '430px',    // Pro Max / Large Android
  tablet: '768px',  // iPad Mini / Tablets
  desktop: '1024px',// Laptops / Desktops
} as const;

export const MOBILE_TOUCH_TARGETS = {
  minTouchTarget: '48px', // WCAG 2.2 AAA / Apple HIG 44pt+ standard
  thumbDockHeight: '72px',// Bottom thumb navigation dock
  headerHeight: '56px',   // Mobile sticky top bar
  safeAreaBottomPadding: 'env(safe-area-inset-bottom, 16px)',
} as const;

export const MOBILE_ADAPTED_TOKENS = {
  // Mobile borders scaled down to prevent layout cramping
  borderStandard: '3px',  // Desktop 4px -> Mobile 3px
  borderHeavy: '4px',     // Desktop 5px -> Mobile 4px
  
  // Mobile shadows clamped to max 6px to avoid horizontal overflow
  shadowLevel1: '2px 2px 0px',
  shadowLevel2: '3px 3px 0px',
  shadowLevel3: '4px 4px 0px',
  shadowLevel4: '6px 6px 0px',

  // Fluid Mobile Typography
  displayMammothMobile: '36px',
  displayLargeMobile: '28px',
  heading1Mobile: '22px',
  bodyMobile: '14px',
} as const;

export const HAPTIC_PATTERNS = {
  lightTap: 10,                 // 10ms micro pulse on button press
  mediumClick: 25,              // 25ms tactile switch feedback
  heavySuccess: [15, 50, 25],   // Pattern on goal completion / quest cleared
  errorBuzz: [40, 60, 40],      // Error alert buzz
} as const;

export function triggerHaptic(type: keyof typeof HAPTIC_PATTERNS = 'lightTap') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(HAPTIC_PATTERNS[type]);
    } catch {
      // Ignore vibration if unsupported
    }
  }
}

// ============================================================================
// 11. HELPER FUNCTIONS & COMPONENT TOKENS EXPORT
// ============================================================================
export function getThemeTokens(mode: ThemeMode) {
  return {
    colors: COLORS[mode],
    shadows: SHADOWS[mode],
    borders: BORDERS,
    spacing: SPACING,
    fonts: FONTS,
    typeScale: TYPE_SCALE,
    radii: RADII,
    transitions: TRANSITIONS,
    tactileOffsets: TACTILE_OFFSETS,
    zIndex: Z_INDEX,
    rotations: ROTATIONS,
    mobile: {
      breakpoints: MOBILE_BREAKPOINTS,
      touchTargets: MOBILE_TOUCH_TARGETS,
      adapted: MOBILE_ADAPTED_TOKENS,
      haptics: HAPTIC_PATTERNS,
    }
  };
}

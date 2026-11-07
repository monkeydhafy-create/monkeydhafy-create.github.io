// KAIROS Design Tokens Specification (Zinc / Emerald Tech Scale)

export const TOKENS = {
  colors: {
    dark: {
      bgCanvas: '#09090b',
      bgCard: '#121215',
      bgSubtle: '#18181b',
      bgHover: '#27272a',
      borderSubtle: '#27272a',
      borderActive: '#3f3f46',
      borderGlow: 'rgba(16, 185, 129, 0.25)',
      textPrimary: '#f4f4f5',
      textSecondary: '#a1a1aa',
      textMuted: '#71717a',
    },
    light: {
      bgCanvas: '#fafafa',
      bgCard: '#ffffff',
      bgSubtle: '#f4f4f5',
      bgHover: '#e4e4e7',
      borderSubtle: '#e4e4e7',
      borderActive: '#d4d4d8',
      borderGlow: 'rgba(16, 185, 129, 0.2)',
      textPrimary: '#09090b',
      textSecondary: '#52525b',
      textMuted: '#a1a1aa',
    },
    accents: {
      emerald: '#10b981',
      cyan: '#06b6d4',
      violet: '#8b5cf6',
      amber: '#f59e0b',
      rose: '#f43f5e',
    },
  },
  typography: {
    fontSans: '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif',
    fontDisplay: '"Space Grotesk", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
  },
  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  transitions: {
    fast: '100ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '180ms cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export type ThemeMode = 'dark' | 'light';

export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    const patterns = {
      light: [8],
      medium: [18],
      success: [12, 40, 12],
      warning: [25, 60, 25],
    };
    navigator.vibrate(patterns[type]);
  } catch {
    // Graceful fallback on unsupported browsers
  }
}

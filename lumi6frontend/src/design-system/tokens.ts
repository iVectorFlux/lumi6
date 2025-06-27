export const designTokens = {
  colors: {
    brand: {
      primary: 'hsl(222.2 47.4% 11.2%)',
      primaryForeground: 'hsl(210 40% 98%)',
      secondary: 'hsl(210 40% 96.1%)',
      secondaryForeground: 'hsl(222.2 47.4% 11.2%)',
      accent: 'hsl(210 40% 96.1%)',
      accentForeground: 'hsl(222.2 47.4% 11.2%)',
    },
    status: {
      success: 'hsl(142.1 76.2% 36.3%)',
      successForeground: 'hsl(355.7 100% 97.3%)',
      warning: 'hsl(47.9 95.8% 53.1%)',
      warningForeground: 'hsl(26 83.3% 14.1%)',
      error: 'hsl(0 84.2% 60.2%)',
      errorForeground: 'hsl(210 40% 98%)',
      info: 'hsl(217.2 91.2% 59.8%)',
      infoForeground: 'hsl(210 40% 98%)',
    },
    neutral: {
      50: 'hsl(210 40% 98%)',
      100: 'hsl(210 40% 96.1%)',
      200: 'hsl(214.3 31.8% 91.4%)',
      300: 'hsl(213 27.8% 84.0%)',
      400: 'hsl(215.4 16.3% 46.9%)',
      500: 'hsl(215.3 19.3% 34.5%)',
      600: 'hsl(215.3 25% 26.7%)',
      700: 'hsl(215.3 25% 26.7%)',
      800: 'hsl(217.9 10.6% 64.9%)',
      900: 'hsl(222.2 84% 4.9%)',
    },
    cefr: {
      a1: 'hsl(195 100% 73%)', // Light blue
      a2: 'hsl(195 82% 43%)',  // Blue
      b1: 'hsl(200 100% 13%)', // Dark blue
      b2: 'hsl(43 96% 52%)',   // Yellow
      c1: 'hsl(33 100% 49%)',  // Orange
      c2: 'hsl(262 83% 58%)',  // Purple
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
  },
  typography: {
    heading1: 'text-3xl lg:text-4xl font-bold tracking-tight',
    heading2: 'text-2xl lg:text-3xl font-bold tracking-tight',
    heading3: 'text-xl lg:text-2xl font-semibold',
    heading4: 'text-lg font-semibold',
    body: 'text-base leading-relaxed',
    bodySmall: 'text-sm leading-relaxed',
    caption: 'text-sm text-gray-600',
    captionSmall: 'text-xs text-gray-500',
    button: 'text-sm font-medium',
    label: 'text-sm font-medium',
  },
  borderRadius: {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  },
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  },
  animation: {
    fadeIn: 'animate-fade-in',
    scaleIn: 'animate-scale-in',
    float: 'animate-float',
  },
} as const;

// CSS Variables mapping for dynamic theming
export const cssVariables = {
  '--color-primary': designTokens.colors.brand.primary,
  '--color-primary-foreground': designTokens.colors.brand.primaryForeground,
  '--color-secondary': designTokens.colors.brand.secondary,
  '--color-secondary-foreground': designTokens.colors.brand.secondaryForeground,
  '--color-success': designTokens.colors.status.success,
  '--color-warning': designTokens.colors.status.warning,
  '--color-error': designTokens.colors.status.error,
  '--color-info': designTokens.colors.status.info,
  '--spacing-xs': designTokens.spacing.xs,
  '--spacing-sm': designTokens.spacing.sm,
  '--spacing-md': designTokens.spacing.md,
  '--spacing-lg': designTokens.spacing.lg,
  '--spacing-xl': designTokens.spacing.xl,
} as const;

// Type exports for TypeScript support
export type DesignTokens = typeof designTokens;
export type ColorTokens = keyof typeof designTokens.colors;
export type SpacingTokens = keyof typeof designTokens.spacing;
export type TypographyTokens = keyof typeof designTokens.typography; 
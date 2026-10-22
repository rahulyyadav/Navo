export const colors = {
  homeTop: '#526D84',
  homeMiddle: '#3E586E',
  homeBottom: '#253D52',
  surface: 'rgba(31, 52, 72, 0.80)',
  surfaceSoft: 'rgba(204,222,239,0.14)',
  night: '#0D141A',
  nightDeep: '#080D12',
  navy: '#19293A',
  navySoft: '#1D2E3F',
  slate: '#2A3437',
  lime: '#E4FF89',
  limeDeep: '#C4E85F',
  white: '#FFFFFF',
  ink: '#FFFFFF',
  onAccent: '#19293A',
  muted: '#EDF3F7',
  faint: '#E4EDF5',
  line: 'rgba(255,255,255,0.12)',
  lineSoft: 'rgba(255,255,255,0.07)',
  danger: '#FF9D8A',
  dangerDeep: '#FF6F61',
  warning: '#FFB86B',
  success: '#9BE89B',
  info: '#8FD3FF',
};

export const radius = { sm: 10, md: 18, lg: 28, xl: 34, pill: 999 };

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 44 };

export const shadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.28,
  shadowRadius: 24,
  elevation: 4,
};

export const glowLime = {
  shadowColor: colors.lime,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.32,
  shadowRadius: 26,
  elevation: 8,
};

export const glowDanger = {
  shadowColor: colors.dangerDeep,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.5,
  shadowRadius: 34,
  elevation: 12,
};

export const gradients = {
  night: [colors.homeTop, colors.homeMiddle, colors.homeBottom] as const,
  card: ['rgba(29,46,63,0.95)', 'rgba(19,31,42,0.92)'] as const,
  lime: [colors.lime, colors.limeDeep] as const,
  danger: [colors.danger, colors.dangerDeep] as const,
  hero: ['rgba(13,20,26,0.15)', 'rgba(13,20,26,0.72)', colors.night] as const,
};

// Shared light palette for discovery, profile, and authentication.
export const lightTheme = {
  background: '#FFFFFF',
  green: '#0C6243',
  ink: '#222E29',
  muted: '#66756C',
  surface: '#F5F7F6',
  border: '#E0E9E3',
  mint: '#DEF7E9',
  danger: '#A34036',
} as const;

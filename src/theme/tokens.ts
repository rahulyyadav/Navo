export const colors = {
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
  muted: 'rgba(255,255,255,0.74)',
  faint: 'rgba(255,255,255,0.62)',
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
  night: [colors.nightDeep, colors.night, colors.navy] as const,
  card: ['rgba(29,46,63,0.95)', 'rgba(19,31,42,0.92)'] as const,
  lime: [colors.lime, colors.limeDeep] as const,
  danger: [colors.danger, colors.dangerDeep] as const,
  hero: ['rgba(13,20,26,0.15)', 'rgba(13,20,26,0.72)', colors.night] as const,
};

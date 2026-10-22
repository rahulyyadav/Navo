export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

export const lightPalette = {
  background: '#FFFFFF', surface: '#F5F7F6', elevated: '#FFFFFF', border: '#E0E9E3',
  ink: '#222E29', secondaryText: '#415C49', muted: '#66756C', faint: '#849289',
  green: '#0C6243', primary: '#0C6243', onPrimary: '#FFFFFF', mint: '#DEF7E9',
  danger: '#A34036', dangerSurface: '#FFF5EF',
  ticket: '#FFFDEB', pink: '#AD278B', pinkBorder: '#EED1E1',
  search: '#FFFFFF', searchFocus: '#F8FCFA', veilRGB: '255,255,255',
} as const;
export type ThemePalette = { [K in keyof typeof lightPalette]: string };
export const darkPalette: ThemePalette = {
  background: '#000000', surface: '#121212', elevated: '#1C1C1E', border: '#2C2C2E',
  ink: '#F5F5F7', secondaryText: '#CECED3', muted: '#ABABB1', faint: '#919198',
  green: '#91DDB5', primary: '#176443', onPrimary: '#FFFFFF', mint: '#223D2D',
  danger: '#FFB4A5', dangerSurface: '#352620',
  ticket: '#29262B', pink: '#F2A4D9', pinkBorder: '#644358',
  search: '#1C1C1E', searchFocus: '#242426', veilRGB: '0,0,0',
};
export const palettes: Record<ThemeScheme, ThemePalette> = { light: lightPalette, dark: darkPalette };
export function validThemeMode(value: unknown): value is ThemeMode { return value === 'system' || value === 'light' || value === 'dark'; }
export function resolveTheme(mode: ThemeMode, system: string | null | undefined): ThemeScheme { return mode === 'system' ? system === 'dark' ? 'dark' : 'light' : mode; }

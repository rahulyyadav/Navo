import { useTheme } from '@/context/ThemeContext';
import { palettes, type ThemePalette } from './palettes';

/** Build each style table once, then select it without allocations on renders. */
export function createThemedStyles<T>(build: (palette: ThemePalette) => T) {
  const styles = { light: build(palettes.light), dark: build(palettes.dark) };
  return function useThemedStyles() { return styles[useTheme().scheme]; };
}

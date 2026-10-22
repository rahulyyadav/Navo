import { useTheme } from '@/context/ThemeContext';
import type { BottomBackdropProps } from './BottomBackdrop.types';

export function BottomBackdrop({ bottomGap }: BottomBackdropProps) {
  const { palette } = useTheme();
  // Keep the mask and backdrop filter on the same element so it samples page content.
  return <div aria-hidden style={{
    position: 'absolute', top: -30, bottom: -bottomGap, left: 0, right: 0,
    pointerEvents: 'none',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    maskImage: 'linear-gradient(to bottom, transparent, black 70%)',
    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 70%)',
    backgroundImage: `linear-gradient(to bottom, rgba(${palette.veilRGB},0), rgba(${palette.veilRGB},.72))`,
  }}/>;
}

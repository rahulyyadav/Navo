import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Keep readable lines on wide phones and breathing room around the home indicator. */
export function usePageLayout() {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return {
    compact: width < 360 || fontScale > 1.25,
    page: { width: '100%' as const, maxWidth: 720, alignSelf: 'center' as const, paddingHorizontal: width < 360 || fontScale > 1.25 ? 14 : 20, paddingBottom: Math.max(32, insets.bottom + 24) },
  };
}

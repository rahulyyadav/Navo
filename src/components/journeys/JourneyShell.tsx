import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJourneyStyles } from './journey-styles';
export function JourneyShell({ children, dock = false, scroll = true, padBottom = 0, scenery = false }: PropsWithChildren<{
    dock?: boolean;
    scroll?: boolean;
    padBottom?: number;
    scenery?: boolean;
}>) {
    const s = useJourneyStyles();
    const { palette, scheme } = useTheme();
    const insets = useSafeAreaInsets();
    const bottom = Math.max(insets.bottom, 20) + (dock ? 110 : 28) + padBottom;
    const content = { width: '100%' as const, maxWidth: 660, alignSelf: 'center' as const, gap: 18, paddingTop: insets.top + 22, paddingBottom: bottom, paddingLeft: Math.max(insets.left, 22), paddingRight: Math.max(insets.right, 22) };
    return <View style={s.page}>{scenery ? <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 420, height: 420, borderRadius: 210, right: -210, top: -100, backgroundColor: palette.green, opacity: scheme === 'dark' ? 0.055 : 0.045 }}/>
        <Svg width="100%" height="100%" viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', opacity: scheme === 'dark' ? 0.11 : 0.08 }}>
            <Path d="M-80 510 C 18 455 66 474 123 405 S 207 300 275 350 S 365 426 470 333" fill="none" stroke={palette.green} strokeWidth="1"/>
            <Path d="M-80 527 C 18 472 66 491 123 422 S 207 317 275 367 S 365 443 470 350" fill="none" stroke={palette.green} strokeWidth="1"/>
            <Path d="M-80 544 C 18 489 66 508 123 439 S 207 334 275 384 S 365 460 470 367" fill="none" stroke={palette.green} strokeWidth="1"/>
            <Path d="M-80 561 C 18 506 66 525 123 456 S 207 351 275 401 S 365 477 470 384" fill="none" stroke={palette.green} strokeWidth="1"/>
        </Svg>
    </View> : null}{scroll ? <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={content}>{children}</ScrollView> : <View style={[{ flex: 1 }, content]}>{children}</View>}</View>;
}

import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJourneyStyles } from './journey-styles';
export function JourneyShell({ children, dock = false, scroll = true, padBottom = 0 }: PropsWithChildren<{
    dock?: boolean;
    scroll?: boolean;
    padBottom?: number;
}>) {
    const s = useJourneyStyles();
    const insets = useSafeAreaInsets();
    const bottom = Math.max(insets.bottom, 20) + (dock ? 110 : 28) + padBottom;
    const content = { width: '100%' as const, maxWidth: 660, alignSelf: 'center' as const, gap: 18, paddingTop: insets.top + 22, paddingBottom: bottom, paddingLeft: Math.max(insets.left, 22), paddingRight: Math.max(insets.right, 22) };
    return <View style={s.page}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={content}>{children}</ScrollView> : <View style={[{ flex: 1 }, content]}>{children}</View>}</View>;
}

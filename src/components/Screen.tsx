import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

export function Screen({ children, padded = true }: PropsWithChildren<{ padded?: boolean }>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, padded && styles.padded]} showsVerticalScrollIndicator={false}>
        {children}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1 },
  padded: { paddingHorizontal: 20 },
  bottomSpace: { height: 32 },
});

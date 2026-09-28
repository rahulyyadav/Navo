import type { PropsWithChildren } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Backdrop, Brand, Eyebrow, Heading, Reveal } from '@/components/ui';
import { gradients } from '@/theme/tokens';

const himalaya = require('../../../assets/navo-onboarding-himalaya.png');

export function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
}: PropsWithChildren<{ eyebrow: string; title: string; subtitle?: string }>) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Backdrop>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <ImageBackground resizeMode="cover" source={himalaya} style={[styles.hero, { height: Math.min(268, Math.max(170, height * 0.27)) }]} imageStyle={styles.heroImage}>
              <LinearGradient colors={[...gradients.hero]} style={StyleSheet.absoluteFill} />
              <View style={[styles.heroBrand, { top: insets.top + 22 }]}><Reveal><Brand /></Reveal></View>
            </ImageBackground>

            <View style={styles.body}>
              <Reveal><Eyebrow>{eyebrow}</Eyebrow>
              <Heading title={title} subtitle={subtitle} /></Reveal>
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Backdrop>
  );
}

export function AuthDivider({ label = 'OR' }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { height: 268, width: '100%' },
  heroImage: { resizeMode: 'cover' },
  heroBrand: { left: 22, position: 'absolute', top: 62 },
  body: { width: '100%', maxWidth: 540, alignSelf: 'center', flex: 1, paddingBottom: 28, paddingHorizontal: 22, paddingTop: 30 },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginVertical: 22 },
  dividerLine: { backgroundColor: 'rgba(255,255,255,0.12)', flex: 1, height: 1 },
  dividerLabel: { color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
});

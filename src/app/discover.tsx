import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SectionHeading } from '@/components/SectionHeading';
import { StatusPill } from '@/components/StatusPill';
import { colors, radius, shadow } from '@/theme/tokens';

const suggestions = ['6 days · ABC', 'First high-altitude trek', 'Quiet route · October'];

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.topbar}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>N</Text></View>
        <Text style={styles.brand}>navo</Text>
        <StatusPill label="Prototype" />
      </View>

      <View style={styles.hero}>
        <Text style={styles.kicker}>PLAN WITH CONTEXT</Text>
        <Text style={styles.heroTitle}>A clearer way into the mountains.</Text>
        <Text style={styles.heroCopy}>
          Tell Navo your time, experience, and pace. It builds a route-linked plan, checks the difficult parts,
          and prepares the essentials for offline use.
        </Text>
      </View>

      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>Where do you want to go?</Text>
        <TextInput
          multiline
          placeholder="I have six days for Annapurna Base Camp in October. It is my first trek above 3,000 m..."
          placeholderTextColor="#87928D"
          style={styles.input}
        />
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <View key={suggestion} style={styles.suggestion}><Text style={styles.suggestionText}>{suggestion}</Text></View>
          ))}
        </View>
        <Link href="/plan" asChild>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Build a sample plan</Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        </Link>
      </View>

      <SectionHeading eyebrow="Why Navo" title="A plan that shows its work" />
      <View style={styles.featureGrid}>
        <View style={styles.featureCard}>
          <Text style={styles.featureNumber}>01</Text>
          <Text style={styles.featureTitle}>Grounded</Text>
          <Text style={styles.featureCopy}>Plans connect to curated route records instead of invented coordinates.</Text>
        </View>
        <View style={styles.featureCard}>
          <Text style={styles.featureNumber}>02</Text>
          <Text style={styles.featureTitle}>Checked</Text>
          <Text style={styles.featureCopy}>Ordinary code audits route continuity, workload, elevation, and missing facts.</Text>
        </View>
      </View>

      <Link href="/safety" asChild>
        <Pressable style={styles.offlineCard}>
          <View>
            <Text style={styles.offlineKicker}>OFFLINE-FIRST</Text>
            <Text style={styles.offlineTitle}>Carry the essentials past the last signal.</Text>
          </View>
          <Text style={styles.offlineArrow}>↗</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingBottom: 26, paddingTop: 12 },
  brandMark: { alignItems: 'center', backgroundColor: colors.forest, borderRadius: 12, height: 36, justifyContent: 'center', width: 36 },
  brandLetter: { color: colors.paper, fontSize: 17, fontWeight: '900' },
  brand: { color: colors.ink, flex: 1, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  hero: { paddingBottom: 23, paddingTop: 4 },
  kicker: { color: colors.ember, fontSize: 11, fontWeight: '800', letterSpacing: 1.7, marginBottom: 10 },
  heroTitle: { color: colors.ink, fontSize: 42, fontWeight: '900', letterSpacing: -1.7, lineHeight: 44, maxWidth: 345 },
  heroCopy: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 15, maxWidth: 360 },
  promptCard: { ...shadow, backgroundColor: colors.white, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, marginBottom: 36, padding: 18 },
  promptLabel: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 9 },
  input: { backgroundColor: '#F4F6F2', borderRadius: radius.md, color: colors.ink, fontSize: 15, lineHeight: 22, minHeight: 116, padding: 15, textAlignVertical: 'top' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 13 },
  suggestion: { backgroundColor: colors.paper, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  suggestionText: { color: colors.moss, fontSize: 11, fontWeight: '700' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.forest, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 17, paddingVertical: 15 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  arrow: { color: colors.white, fontSize: 20 },
  featureGrid: { flexDirection: 'row', gap: 11, marginBottom: 30 },
  featureCard: { backgroundColor: colors.mist, borderRadius: radius.md, flex: 1, minHeight: 178, padding: 15 },
  featureNumber: { color: colors.fern, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  featureTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 8, marginTop: 25 },
  featureCopy: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  offlineCard: { alignItems: 'flex-end', backgroundColor: colors.ember, borderRadius: radius.lg, flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  offlineKicker: { color: '#FCE5DA', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 7 },
  offlineTitle: { color: colors.white, fontSize: 21, fontWeight: '800', lineHeight: 26, maxWidth: 265 },
  offlineArrow: { color: colors.white, fontSize: 27 },
});

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/Typography';
import { levelLabel } from '@/data/onboarding';
import { tapHaptic } from '@/services/tap-haptics';
import type { EmergencyContact, ExperienceLevel } from '@/types/navo';

import { createThemedStyles } from '@/theme/create-styles';
function Artwork() {
  return <Svg width="100%" height="100%" viewBox="0 0 528 490" preserveAspectRatio="none">
    <Defs><LinearGradient id="profile-leaf" x1="0" y1="0" x2="1" y2=".3"><Stop offset="0" stopColor="#4D8B9B"/><Stop offset={0.42} stopColor="#704C9A"/><Stop offset="1" stopColor="#BC009F"/></LinearGradient><RadialGradient id="profile-glow" cx="0" cy="1" rx="1" ry=".9"><Stop offset="0" stopColor="#BC009F" stopOpacity=".8"/><Stop offset="1" stopColor="#704C9A" stopOpacity="0"/></RadialGradient></Defs>
    <Path d="M8 482Q8 490 16 490H205C426 490 520 402 520 205V16Q520 8 512 8H320C99 8 8 108 8 330Z" fill="url(#profile-leaf)"/>
    <Path d="M8 482Q8 490 16 490H205C426 490 520 402 520 205V16Q520 8 512 8H320C99 8 8 108 8 330Z" fill="url(#profile-glow)"/>
  </Svg>;
}

export function ProfileCard({ name, email, level, contact, since }: {
  name: string; email: string; level: ExperienceLevel | null; contact: EmergencyContact | null; since?: string;
}) {
  const s = useCardStyles();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(240, Math.min(width - 44, 360));
  const height = Math.round(cardWidth * 1.32);
  const padding = cardWidth * .065;
  const [flipped, setFlipped] = useState(false);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(flipped ? 1 : 0, { duration: 620, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [flipped, progress]);
  // Emergency information returns to the private face when leaving Profile.
  useFocusEffect(useCallback(() => () => { setFlipped(false); }, []));
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${progress.value * 180}deg` }],
    opacity: progress.value > .5 ? 0 : 1,
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${180 + progress.value * 180}deg` }],
    opacity: progress.value < .5 ? 0 : 1,
  }));
  const validDate = since && Number.isFinite(Date.parse(since));
  const date = validDate ? new Date(since).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'YOUR TRAIL CARD';
  return <View style={s.wrap}>
    <Pressable accessibilityRole="button" accessibilityLabel={flipped ? `Emergency contact: ${contact ? `${contact.name}, ${contact.phone}` : 'not added yet'}. Show profile card front` : `${name}, ${email}. Show emergency contact on back of profile card`} accessibilityHint="Double tap to flip the card" onPress={() => { tapHaptic(); setFlipped(value => !value); }} style={{ width: cardWidth, height }}>
      <Animated.View pointerEvents="none" aria-hidden={flipped} accessibilityElementsHidden={flipped} importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'} style={[s.face, front]}>
        <View style={{ position: 'absolute', top: padding, left: padding, right: padding, height: cardWidth * .64 }}><Artwork/></View>
        <View style={{ position: 'absolute', top: cardWidth * .77, left: padding, right: padding, gap: 3 }}>
          <Text adjustsFontSizeToFit minimumFontScale={.55} numberOfLines={1} style={[s.name, { fontSize: cardWidth * .097, lineHeight: cardWidth * .115 }]}>{name}</Text>
          <Text numberOfLines={1} style={[s.role, { fontSize: cardWidth * .047 }]}>{level ? levelLabel(level).toUpperCase() : 'MOUNTAIN EXPLORER'}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={s.email}>{email}</Text>
        </View>
        <View style={[s.stamp, { left: padding, bottom: padding + 34, width: cardWidth * .14, height: cardWidth * .14 }]}><View style={s.stampInner}><Text style={s.stampSmall}>NEPAL</Text><Text style={s.stampN}>N</Text></View></View>
        <View style={[s.ticket, { left: padding, bottom: padding }]}><Text style={s.ticketBrand}>NAVO</Text><View style={s.stripes}>{Array.from({ length: 6 }, (_, i) => <View key={i} style={s.stripe}/>)}</View><Text style={s.date}>{date}</Text></View>
        <View style={[s.company, { right: padding, bottom: padding }]}><Text style={s.companyText}>NAVO</Text><Text style={s.companyText}>NEPAL</Text></View>
      </Animated.View>
      <Animated.View pointerEvents="none" aria-hidden={!flipped} accessibilityElementsHidden={!flipped} importantForAccessibility={!flipped ? 'no-hide-descendants' : 'auto'} style={[s.face, s.back, back, { padding }]}>
        <View style={s.backHeader}><Text style={s.backLabel}>NAVO / SAFETY CARD</Text><Text style={s.flipIcon}>↻</Text></View>
        <View style={s.backBody}>{cardWidth > 320 ? <View style={s.cross}><Text style={s.crossText}>+</Text></View> : null}<Text style={[s.backTitle, { fontSize: Math.round(cardWidth * .085), lineHeight: Math.round(cardWidth * .095) }]}>Someone{`\n`}to call.</Text><Text style={s.backLabel}>EMERGENCY CONTACT</Text><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={.8} style={[s.contactName, { fontSize: Math.max(18, Math.round(cardWidth * .061)), lineHeight: Math.max(22, Math.round(cardWidth * .072)) }]}>{contact?.name || 'Not added yet'}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.65} style={s.phone}>{contact?.phone || 'Add a trusted contact below.'}</Text><Text numberOfLines={2} style={s.backCopy}>{contact ? 'Your emergency contact, close at hand.' : 'Edit your details to keep a trusted contact on your card.'}</Text></View>
        <View style={s.backFooter}><Text style={s.backLabel}>{name}</Text><Text style={s.backLabel}>TAP TO RETURN ↻</Text></View>
      </Animated.View>
    </Pressable>
    <Text style={s.hint}>{flipped ? 'Tap to return to your profile' : 'Tap your card for emergency contact'} ↻</Text>
  </View>;
}
const useCardStyles = createThemedStyles(t => {
const pink = t.pink;
  const stamp = t.background === '#000000' ? '#AAA3FF' : '#4D41FF';
return StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14, paddingVertical: 6 },
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.ticket, borderWidth: 1.5, borderColor: t.pinkBorder, borderRadius: 15, backfaceVisibility: 'hidden', overflow: 'hidden' },
  name: { color: pink, fontWeight: '800', letterSpacing: -1 }, role: { color: pink, fontWeight: '700', letterSpacing: .5 }, email: { color: t.pink, fontSize: 11, marginTop: 5 },
  stamp: { position: 'absolute', borderWidth: 2, borderColor: stamp, borderRadius: 40, padding: 4, transform: [{ rotate: '-16deg' }] }, stampInner: { borderWidth: 1, borderColor: stamp, flex: 1, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }, stampSmall: { color: stamp, fontSize: 6, fontWeight: '800', letterSpacing: 1 }, stampN: { color: stamp, fontSize: 20, lineHeight: 21, fontWeight: '800' },
  ticket: { position: 'absolute', flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: pink, borderRadius: 4, height: 25, maxWidth: '72%', overflow: 'hidden' }, ticketBrand: { color: pink, fontSize: 11, fontWeight: '700', paddingHorizontal: 8 }, stripes: { width: 20, height: 25, flexDirection: 'row', gap: 2, overflow: 'hidden', borderLeftWidth: 1, borderRightWidth: 1, borderColor: pink }, stripe: { height: 34, width: 1.5, backgroundColor: pink, transform: [{ rotate: '30deg' }] }, date: { color: pink, fontSize: 10, fontWeight: '700', paddingHorizontal: 8 }, company: { position: 'absolute', alignItems: 'flex-start' }, companyText: { color: pink, fontSize: 12, lineHeight: 13, fontWeight: '800' },
  hint: { color: t.muted, fontSize: 11, textAlign: 'center' }, back: { justifyContent: 'space-between' }, backHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, backLabel: { color: t.pink, fontSize: 9, fontWeight: '700', letterSpacing: .6, flexShrink: 1 }, flipIcon: { color: pink, fontSize: 26 }, backBody: { gap: 9 }, cross: { width: 44, height: 44, backgroundColor: t.mint, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, crossText: { color: pink, fontSize: 36, lineHeight: 42 }, backTitle: { color: pink, fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -1 }, contactName: { color: t.pink, fontSize: 22, lineHeight: 26, fontWeight: '700' }, phone: { color: pink, fontSize: 18, lineHeight: 24 }, backCopy: { color: t.secondaryText, fontSize: 12, lineHeight: 19 }, backFooter: { flexDirection: 'row', gap: 14, justifyContent: 'space-between' },
});
});

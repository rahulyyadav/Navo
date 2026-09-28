import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type EntryOrExitLayoutType,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, glowLime, radius, shadow, space } from '@/theme/tokens';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; listener.remove(); };
  }, []);
  return reduced;
}

export function enter(fallback: EntryOrExitLayoutType, reduced: boolean) {
  return reduced ? FadeIn.duration(0) : fallback;
}

export function Reveal({ children, delay = 0, distance = 18 }: PropsWithChildren<{ delay?: number; distance?: number }>) {
  const reduced = useReducedMotion();
  if (reduced) return <View>{children}</View>;
  return <Animated.View entering={FadeInDown.duration(520).delay(delay).springify().damping(15)}><View>{children}</View></Animated.View>;
}

export function Backdrop({ children }: PropsWithChildren) {
  return <View style={ui.backdropRoot}>
    <LinearGradient colors={[...gradients.night]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[ui.glow, ui.glowTopRight]} />
    <View pointerEvents="none" style={[ui.glow, ui.glowBottomLeft]} />
    <View pointerEvents="none" style={ui.grain} />
    {children}
  </View>;
}

export function Card({ children, style, padded = true }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; padded?: boolean }>) {
  return <View style={[ui.card, padded && ui.cardPadded, style]}>{children}</View>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <View style={ui.brandRow}>
    <View style={ui.brandMark}>
      <Text style={ui.brandLetter}>N</Text>
      <View style={ui.brandPeak} />
    </View>
    <View>
      <Text style={ui.brandName}>NAVO</Text>
      {!compact && <Text style={ui.brandTag}>TREK NEPAL SAFELY</Text>}
    </View>
  </View>;
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <Text style={ui.eyebrow}>{children}</Text>;
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={ui.headingBlock}>
    <Text accessibilityRole="header" style={ui.h1}>{title}</Text>
    {subtitle ? <Text style={ui.lede}>{subtitle}</Text> : null}
  </View>;
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return <View style={ui.sectionRow}>
    <Text style={ui.sectionTitle}>{title}</Text>
    {action}
  </View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'quiet';
  busy?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', busy = false, disabled = false, icon, style }: ButtonProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactive = disabled || busy;
  const press = (value: number) => {
    if (reduced) { scale.value = value; return; }
    scale.value = withSpring(value, { damping: 16, stiffness: 320, mass: 0.7 });
  };
  const tone = variant === 'danger' ? ui.buttonDanger : variant === 'outline' ? ui.buttonOutline : variant === 'quiet' ? ui.buttonQuiet : ui.buttonPrimary;
  const labelStyle = variant === 'primary' || variant === 'danger' ? ui.buttonTextDark : ui.buttonTextLight;

  if (variant === 'primary' || variant === 'danger') {
    const gradientColors: readonly [string, string] = variant === 'danger' ? gradients.danger : gradients.lime;
    return <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => press(0.965)}
      onPressOut={() => press(1)}
      style={({ pressed }) => [ui.buttonBase, variant === 'danger' ? ui.buttonDangerWrap : ui.buttonPrimaryWrap, inactive && ui.inactive, pressed && !reduced && { opacity: 0.92 }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animated]}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ui.gradientFill} />
      </Animated.View>
      <View style={ui.buttonInner}>
        {busy ? <ActivityIndicator color={colors.onAccent} /> : icon ? <Text style={[labelStyle, ui.buttonIcon]}>{icon}</Text> : null}
        <Text style={[labelStyle, ui.buttonLabel]} numberOfLines={1}>{label}</Text>
        {!busy && !icon && <Text style={[labelStyle, ui.buttonArrow]}>→</Text>}
      </View>
    </Pressable>;
  }

  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: inactive, busy }}
    disabled={inactive}
    onPress={onPress}
    onPressIn={() => press(0.97)}
    onPressOut={() => press(1)}
    style={({ pressed }) => [ui.buttonBase, tone, inactive && ui.inactive, pressed && !reduced && { opacity: 0.8 }, style]}
  >
    <Animated.View style={[ui.buttonInner, animated]}>
      {busy ? <ActivityIndicator color={colors.lime} /> : icon ? <Text style={[labelStyle, ui.buttonIcon]}>{icon}</Text> : null}
      <Text style={[labelStyle, ui.buttonLabel]} numberOfLines={1}>{label}</Text>
    </Animated.View>
  </Pressable>;
}

export function LinkAction({ label, onPress, disabled = false, align = 'center' }: { label: string; onPress: () => void; disabled?: boolean; align?: 'left' | 'center' | 'right' }) {
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [ui.linkAction, { alignSelf: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }, pressed && ui.inactive, disabled && ui.inactive]}
  >
    <Text style={ui.linkLabel}>{label}</Text>
  </Pressable>;
}

export function Field({
  label,
  error,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const ring = useSharedValue(0);
  useEffect(() => { ring.value = withTiming(focused ? 1 : 0, { duration: reduced ? 0 : 180 }); }, [focused, ring, reduced]);
  const animatedRing = useAnimatedStyle(() => ({
    borderColor: focused ? colors.lime : colors.line,
    backgroundColor: focused ? colors.slate : colors.navy,
    transform: [{ scale: reduced ? 1 : 1 + ring.value * 0.006 }],
  }));
  return <View style={ui.fieldBlock}>
    <Text style={ui.fieldLabel}>{label}</Text>
    <Animated.View style={[ui.fieldShell, animatedRing, error ? ui.fieldError : null]}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.faint}
        {...input}
        onFocus={event => { setFocused(true); input.onFocus?.(event); }}
        onBlur={event => { setFocused(false); input.onBlur?.(event); }}
        style={[ui.fieldInput, input.style]}
      />
    </Animated.View>
    {error ? <Text accessibilityRole="alert" style={ui.fieldErrorText}>{error}</Text> : null}
    {!error && hint ? <Text style={ui.fieldHint}>{hint}</Text> : null}
  </View>;
}

export function OptionCard({
  selected,
  onPress,
  title,
  detail,
  symbol,
  disabled = false,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  detail?: string;
  symbol?: string;
  disabled?: boolean;
}) {
  const glow = useSharedValue(selected ? 1 : 0);
  useEffect(() => { glow.value = withTiming(selected ? 1 : 0, { duration: 220 }); }, [selected, glow]);
  const animated = useAnimatedStyle(() => ({
    borderColor: selected ? colors.lime : colors.line,
    backgroundColor: selected ? 'rgba(228,255,137,0.10)' : 'rgba(25,41,58,0.72)',
    transform: [{ scale: 1 + glow.value * 0.012 }],
  }));
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [pressed && ui.inactive]}>
    <Animated.View style={[ui.optionCard, animated]}>
      {symbol ? <View style={[ui.optionSymbol, selected && ui.optionSymbolOn]}><Text style={[ui.optionSymbolText, selected && ui.optionSymbolTextOn]}>{symbol}</Text></View> : null}
      <View style={ui.optionBody}>
        <Text style={[ui.optionTitle, selected && ui.optionTitleOn]}>{title}</Text>
        {detail ? <Text style={ui.optionDetail}>{detail}</Text> : null}
      </View>
      <View style={[ui.radio, selected && ui.radioOn]}>{selected ? <View style={ui.radioDot} /> : null}</View>
    </Animated.View>
  </Pressable>;
}

export function Chip({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.chip, selected && ui.chipOn, pressed && ui.inactive, disabled && ui.inactive]}>
    <Text style={[ui.chipText, selected && ui.chipTextOn]}>{label}</Text>
    {selected ? <Text style={ui.chipTick}>✓</Text> : null}
  </Pressable>;
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'lime' | 'warning' | 'danger' | 'info' }) {
  const map = {
    neutral: ui.badgeNeutral,
    lime: ui.badgeLime,
    warning: ui.badgeWarning,
    danger: ui.badgeDanger,
    info: ui.badgeInfo,
  } as const;
  return <View style={[ui.badge, map[tone]]}><Text style={ui.badgeText}>{label}</Text></View>;
}

export function Avatar({ uri, name, size = 46 }: { uri?: string | null; name?: string; size?: number }) {
  const initials = (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'N';
  return uri
    ? <Image source={{ uri }} style={[ui.avatar, { width: size, height: size, borderRadius: size / 2 }]} />
    : <View style={[ui.avatar, ui.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[ui.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text></View>;
}

export function Notice({ message, tone = 'danger' }: { message: string; tone?: 'danger' | 'warning' | 'success' | 'info' }) {
  if (!message) return null;
  const map = { danger: ui.noticeDanger, warning: ui.noticeWarning, success: ui.noticeSuccess, info: ui.noticeInfo } as const;
  return <Animated.View entering={enter(FadeIn.duration(240), false)} style={[ui.notice, map[tone]]}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.noticeText}>{message}</Text>
  </Animated.View>;
}

export function EmptyState({ symbol, title, detail, action }: { symbol: string; title: string; detail: string; action?: React.ReactNode }) {
  return <View style={ui.empty}>
    <View style={ui.emptySymbol}><Text style={ui.emptySymbolText}>{symbol}</Text></View>
    <Text style={ui.emptyTitle}>{title}</Text>
    <Text style={ui.emptyDetail}>{detail}</Text>
    {action}
  </View>;
}

export function Row({ children, style, gap = space.md }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; gap?: number }>) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return <View style={ui.stat}>
    <Text style={ui.statValue}>{value}</Text>
    <Text style={ui.statLabel}>{label}</Text>
  </View>;
}

export const AnimatedCard = Animated.createAnimatedComponent(Card);
export const AnimatedList = Animated.View;
export const relayout = LinearTransition.springify().damping(18);
export const pressShadow = shadow;
export const limeGlow = glowLime;

const ui = StyleSheet.create({
  backdropRoot: { flex: 1, backgroundColor: colors.night },
  glow: { position: 'absolute', borderRadius: 999, opacity: 0.16 },
  glowTopRight: { width: 380, height: 380, right: -160, top: -170, backgroundColor: colors.lime },
  glowBottomLeft: { width: 320, height: 320, left: -150, bottom: -140, backgroundColor: colors.info, opacity: 0.1 },
  grain: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },

  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.navy, overflow: 'hidden' },
  cardPadded: { padding: space.lg },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  brandLetter: { color: colors.onAccent, fontSize: 25, fontWeight: '800', zIndex: 2 },
  brandPeak: { position: 'absolute', bottom: -11, width: 27, height: 27, backgroundColor: colors.navy, transform: [{ rotate: '45deg' }] },
  brandName: { color: colors.ink, fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  brandTag: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 3 },

  eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  headingBlock: { marginBottom: space.lg },
  h1: { color: colors.ink, fontSize: 36, fontWeight: '600', letterSpacing: -1.4, lineHeight: 42 },
  lede: { color: colors.muted, fontSize: 16, lineHeight: 25, marginTop: 12 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1.6 },

  buttonBase: { minHeight: 62, borderRadius: radius.pill, overflow: 'hidden', justifyContent: 'center' },
  buttonPrimaryWrap: { ...glowLime },
  buttonDangerWrap: { ...shadow },
  gradientFill: { flex: 1 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 22, minHeight: 62 },
  buttonLabel: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  buttonTextDark: { color: colors.onAccent },
  buttonTextLight: { color: colors.ink },
  buttonArrow: { color: colors.onAccent, fontSize: 21 },
  buttonIcon: { fontSize: 18 },
  buttonPrimary: {},
  buttonDanger: {},
  buttonOutline: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: 'rgba(25,41,58,0.6)' },
  buttonQuiet: { backgroundColor: 'transparent', minHeight: 52 },
  inactive: { opacity: 0.5 },

  linkAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10 },
  linkLabel: { color: colors.lime, fontSize: 15, fontWeight: '700' },

  fieldBlock: { marginBottom: space.md },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 9 },
  fieldShell: { borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.navy, minHeight: 62, paddingHorizontal: 18, justifyContent: 'center' },
  fieldError: { borderColor: colors.danger },
  fieldInput: { color: colors.ink, fontSize: 17, paddingVertical: 16 },
  fieldErrorText: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 8 },
  fieldHint: { color: colors.faint, fontSize: 13, lineHeight: 19, marginTop: 8 },

  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: 'rgba(25,41,58,0.72)', padding: 16 },
  optionSymbol: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.slate, alignItems: 'center', justifyContent: 'center' },
  optionSymbolOn: { backgroundColor: colors.lime },
  optionSymbolText: { color: colors.muted, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  optionSymbolTextOn: { color: colors.onAccent },
  optionBody: { flex: 1 },
  optionTitle: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  optionTitleOn: { color: colors.ink },
  optionDetail: { color: colors.faint, fontSize: 13, marginTop: 4, lineHeight: 18 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.lime },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.lime },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: 'rgba(25,41,58,0.7)', paddingHorizontal: 16, paddingVertical: 11 },
  chipOn: { borderColor: colors.lime, backgroundColor: 'rgba(228,255,137,0.16)' },
  chipText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: colors.lime },
  chipTick: { color: colors.lime, fontSize: 12, fontWeight: '800' },

  badge: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  badgeNeutral: { backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeLime: { backgroundColor: 'rgba(228,255,137,0.18)' },
  badgeWarning: { backgroundColor: 'rgba(255,184,107,0.18)' },
  badgeDanger: { backgroundColor: 'rgba(255,111,97,0.2)' },
  badgeInfo: { backgroundColor: 'rgba(143,211,255,0.16)' },
  badgeText: { color: colors.ink, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  avatar: { backgroundColor: colors.slate },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.line },
  avatarText: { color: colors.lime, fontWeight: '800', letterSpacing: 0.5 },

  notice: { borderRadius: radius.md, borderWidth: 1, padding: 14, marginTop: space.md },
  noticeDanger: { borderColor: 'rgba(255,111,97,0.4)', backgroundColor: 'rgba(255,111,97,0.12)' },
  noticeWarning: { borderColor: 'rgba(255,184,107,0.4)', backgroundColor: 'rgba(255,184,107,0.12)' },
  noticeSuccess: { borderColor: 'rgba(155,232,155,0.4)', backgroundColor: 'rgba(155,232,155,0.12)' },
  noticeInfo: { borderColor: 'rgba(143,211,255,0.35)', backgroundColor: 'rgba(143,211,255,0.1)' },
  noticeText: { color: colors.ink, fontSize: 14, lineHeight: 21 },

  empty: { alignItems: 'center', paddingVertical: space.xxl, gap: 10 },
  emptySymbol: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptySymbolText: { color: colors.lime, fontSize: 30 },
  emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  emptyDetail: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 300 },

  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: colors.lime, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.faint, fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
});

import { useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View, type TextInputProps } from 'react-native';
import { Text, TextInput } from '@/components/Typography';
import { HomePressable } from '@/components/journeys/HomeMotion';
import { useTheme } from '@/context/ThemeContext';
import { createThemedStyles } from '@/theme/create-styles';

export function Card({ children }: PropsWithChildren) { const s = useStyles(); return <View style={s.card}>{children}</View>; }
export function SectionTitle({ title }: { title: string }) { const s = useStyles(); return <Text accessibilityRole="header" style={s.title}>{title}</Text>; }
export function Button({ label, onPress, variant = 'primary', busy, disabled }: { label: string; onPress: () => void; variant?: 'primary' | 'quiet' | 'outline' | 'danger'; busy?: boolean; disabled?: boolean }) {
  const s = useStyles(); const { palette } = useTheme();
  const primary = variant === 'primary';
  const color = primary ? palette.onPrimary : variant === 'danger' ? palette.danger : palette.green;
  return <HomePressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={[s.button, primary && s.primary, variant === 'quiet' && s.quiet, variant === 'danger' && s.danger, (disabled || busy) && { opacity: .5 }]}>{busy && <ActivityIndicator color={color}/>}<Text style={[s.buttonText, { color }]}>{label}</Text></HomePressable>;
}
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const s = useStyles(); return <HomePressable accessibilityRole="button" accessibilityState={{ selected }} aria-pressed={selected} onPress={onPress} style={[s.chip, selected && s.selected]}><Text style={[s.chipText, selected && s.selectedText]}>{label}</Text></HomePressable>;
}
export function Field({ label, hint, style, ...input }: TextInputProps & { label: string; hint?: string }) {
  const s = useStyles(); const { palette } = useTheme(); const [focused, setFocused] = useState(false);
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} {...input} onFocus={event => { setFocused(true); input.onFocus?.(event); }} onBlur={event => { setFocused(false); input.onBlur?.(event); }} style={[s.input, focused && { borderColor: palette.green }, style]}/>{hint && <Text style={s.hint}>{hint}</Text>}</View>;
}
export function Badge({ label }: { label: string; tone?: string }) { const s = useStyles(); return <View style={s.badge}><Text style={s.selectedText}>{label}</Text></View>; }
export function Notice({ message, tone = 'danger' }: { message: string; tone?: string }) { const s = useStyles(); if (!message) return null; return <Text accessibilityRole={tone === 'danger' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[s.notice, tone === 'danger' && s.error]}>{message}</Text>; }
const useStyles = createThemedStyles(t => StyleSheet.create({
  card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 22, padding: 18, gap: 14 },
  title: { color: t.ink, fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -.5 },
  button: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: t.border, backgroundColor: t.elevated, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, primary: { backgroundColor: t.primary, borderColor: t.primary }, quiet: { backgroundColor: 'transparent', borderColor: 'transparent' }, danger: { backgroundColor: t.dangerSurface, borderColor: t.dangerSurface }, buttonText: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 15, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border }, selected: { backgroundColor: t.mint, borderColor: t.green }, chipText: { color: t.muted, fontSize: 12 }, selectedText: { color: t.green, fontSize: 12, fontWeight: '600' },
  field: { gap: 7 }, label: { color: t.secondaryText, fontSize: 12, fontWeight: '600' }, input: { minHeight: 52, color: t.ink, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 15, fontSize: 14 }, hint: { color: t.muted, fontSize: 11 }, badge: { alignSelf: 'flex-start', backgroundColor: t.mint, padding: 10, borderRadius: 12 }, notice: { color: t.secondaryText, fontSize: 12, lineHeight: 20 }, error: { color: t.danger },
}));

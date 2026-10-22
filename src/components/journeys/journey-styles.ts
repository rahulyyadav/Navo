import { StyleSheet } from 'react-native';
import { createThemedStyles } from '@/theme/create-styles';

/** Journey screens share the home/profile design language: themed surfaces, green accents, mint highlights. */
export const useJourneyStyles = createThemedStyles(t => {
  const green = t.green;
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: t.background },
    title: { color: t.ink, fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -1.3 },
    eyebrow: { color: green, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
    subtitle: { color: t.muted, fontSize: 14, lineHeight: 21 },
    text: { color: t.ink, fontSize: 17, fontWeight: '600' },
    small: { color: t.muted, fontSize: 12, lineHeight: 18 },
    error: { color: t.danger, fontSize: 13, lineHeight: 20 },
    link: { color: green, fontSize: 14, fontWeight: '600', paddingVertical: 10 },
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 24, padding: 18, gap: 10 },
    cardTitle: { color: t.ink, fontSize: 17, fontWeight: '600', flexShrink: 1 },
    highlight: { backgroundColor: t.mint, borderColor: 'transparent' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chip: { alignSelf: 'flex-start', minWidth: 44, minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    chipText: { color: t.secondaryText, fontSize: 14, fontWeight: '600' },
    pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: t.background, borderWidth: 1, borderColor: t.border },
    pillText: { color: green, fontSize: 12, fontWeight: '700' },
    sheet: { width: '100%', maxWidth: 660, maxHeight: '85%', alignSelf: 'center', backgroundColor: t.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,38,26,.28)' },
  });
});

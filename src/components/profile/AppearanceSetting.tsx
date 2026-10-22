import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from '@/components/Typography';
import { HomePressable } from '@/components/journeys/HomeMotion';
import { useTheme } from '@/context/ThemeContext';
import { createThemedStyles } from '@/theme/create-styles';
import type { ThemeMode } from '@/theme/palettes';

const options: { mode: ThemeMode; label: string }[] = [{ mode: 'light', label: 'Light' }, { mode: 'dark', label: 'Dark' }, { mode: 'system', label: 'System' }];
function AppearanceIcon({ mode, color }: { mode: ThemeMode; color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {mode === 'light' ? <><Circle cx={12} cy={12} r={4}/><Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></> : mode === 'dark' ? <Path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/> : <Path d="M3 4h18v13H3ZM8 21h8m-4-4v4"/>}
  </Svg>;
}
export function AppearanceSetting() {
  const { mode, palette, setMode, persistenceError } = useTheme();
  const s = useStyles();
  return <View style={s.section}>
    <Text style={s.title}>Appearance</Text>
    <View style={s.options}>
      {options.map(option => <HomePressable key={option.mode} accessibilityRole="button" accessibilityLabel={`${option.label} appearance`} accessibilityState={{ selected: mode === option.mode }} aria-pressed={mode === option.mode} onPress={() => setMode(option.mode)} style={[s.option, mode === option.mode && s.selected]}>
        <AppearanceIcon mode={option.mode} color={mode === option.mode ? palette.green : palette.muted}/>
        <Text style={[s.label, mode === option.mode && s.selectedLabel]}>{option.label}</Text>
      </HomePressable>)}
    </View>
    {persistenceError ? <Text accessibilityRole="alert" style={s.error}>{persistenceError}</Text> : null}
  </View>;
}
const useStyles = createThemedStyles(t => StyleSheet.create({
  section: { padding: 18, gap: 15, backgroundColor: t.surface, borderRadius: 21, borderWidth: 1, borderColor: t.border },
  title: { color: t.ink, fontSize: 15, fontWeight: '700' }, options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minHeight: 74, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: 15, backgroundColor: t.elevated },
  selected: { backgroundColor: t.mint, borderColor: t.green }, label: { color: t.muted, fontSize: 12, fontWeight: '500' }, selectedLabel: { color: t.green, fontWeight: '700' }, error: { color: t.danger, fontSize: 12, lineHeight: 18 },
}));

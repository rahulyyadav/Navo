import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Typography';
import { validDate } from '@/services/journeys/types';
import { addCalendarDays, monthCells, moveMonth } from '@/services/journey-calendar';
import { nepalToday } from '@/services/day-hike';
import { HomePressable } from './HomeMotion';
import { SetupField, SetupIcon } from './SetupUI';
import { useSetupStyles } from './setup-styles';
import { createThemedStyles } from '@/theme/create-styles';

export function journeyDateLabel(value: string) {
  return validDate(value) ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Choose your date';
}
export function JourneyDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const s = useSetupStyles();
  const c = useCalendarStyles();
  const today = nepalToday();
  const [month, setMonth] = useState((validDate(value) ? value : today).slice(0, 7));
  function selectDate(date: string) { if (validDate(date)) setMonth(date.slice(0, 7)); onChange(date); }
  const cells = useMemo(() => monthCells(month), [month]);
  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <View style={{ gap: 17 }}>
    <View style={c.calendar}>
      <View style={c.header}><HomePressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(current => moveMonth(current, -1))} style={c.monthButton}><SetupIcon name="back" size={20}/></HomePressable><Text accessibilityLiveRegion="polite" style={c.month}>{monthLabel}</Text><HomePressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth(current => moveMonth(current, 1))} style={c.monthButton}><View style={{ transform: [{ rotate: '180deg' }] }}><SetupIcon name="back" size={20}/></View></HomePressable></View>
      <View style={c.grid}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <View key={i} style={c.cell}><Text style={c.weekday}>{day}</Text></View>)}
        {cells.map((date, i) => date ? <HomePressable key={date} accessibilityRole="button" accessibilityLabel={journeyDateLabel(date)} accessibilityState={{ selected: value === date }} onPress={() => selectDate(date)} style={c.cell}><View style={[c.day, date === today && c.today, value === date && c.selected]}><Text style={[c.dayText, value === date && c.selectedText]}>{Number(date.slice(-2))}</Text></View></HomePressable> : <View key={`empty-${i}`} style={c.cell}/>)}</View>
      <View style={c.selectedDate}><SetupIcon name="calendar" size={19}/><Text style={c.selectedDateText}>{journeyDateLabel(value)}</Text></View>
    </View>
    <View style={c.shortcuts}>{[{ label: 'Today', date: today }, { label: 'Tomorrow', date: addCalendarDays(today, 1) }, { label: 'In a week', date: addCalendarDays(today, 7) }].map(item => <HomePressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: value === item.date }} onPress={() => selectDate(item.date)} style={[c.shortcut, value === item.date && c.activeShortcut]}><Text style={c.shortcutText}>{item.label}</Text></HomePressable>)}</View>
    <SetupField label="Or enter a date · YYYY-MM-DD" value={value} onChangeText={selectDate} placeholder="YYYY-MM-DD" maxLength={10}/>
    <Text style={s.muted}>Planning date only; transport availability isn’t checked.</Text>
  </View>;
}
const useCalendarStyles = createThemedStyles(t => {
const green = t.green;
return StyleSheet.create({
  calendar: { backgroundColor: t.ticket, borderWidth: 1, borderColor: t.pinkBorder, borderRadius: 24, padding: 16, gap: 14 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, monthButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: t.ticket, alignItems: 'center', justifyContent: 'center' }, month: { color: t.ink, fontSize: 17, fontWeight: '700', flexShrink: 1, textAlign: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: `${100 / 7}%`, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 }, weekday: { color: t.muted, fontSize: 11, fontWeight: '600' }, day: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' }, dayText: { color: t.ink, fontSize: 14 }, selected: { backgroundColor: t.primary, borderColor: green }, selectedText: { color: '#FFFFFF', fontWeight: '700' }, today: { borderColor: t.border }, selectedDate: { paddingTop: 15, borderTopWidth: 1, borderTopColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, selectedDateText: { color: green, fontSize: 13, fontWeight: '600', flexShrink: 1 }, shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, shortcut: { minHeight: 44, borderRadius: 13, backgroundColor: t.surface, paddingHorizontal: 15, justifyContent: 'center' }, activeShortcut: { backgroundColor: t.mint }, shortcutText: { color: green, fontSize: 12, fontWeight: '600' },
});
});

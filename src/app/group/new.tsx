import { useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, Eyebrow, Field, Notice, OptionCard, Reveal } from '@/components/ui';
import { useNavo } from '@/context/NavoContext';
import { trekById, treks } from '@/data/treks';
import { formatDate } from '@/services/format';
import { validateGroupName } from '@/services/group-model';
import { useCloud } from '@/context/CloudContext';
import { CloudStatus } from '@/components/CloudStatus';
import { actionError, requestId } from '@/lib/api';
import { colors, space } from '@/theme/tokens';

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function offsetDate(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function nextWeekend(weeksAhead: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const untilSaturday = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + untilSaturday + weeksAhead * 7);
  return isoDate(date);
}

const PRESETS = [
  { id: 'this-weekend', label: 'This weekend', date: () => nextWeekend(0) },
  { id: 'next-weekend', label: 'Next weekend', date: () => nextWeekend(1) },
  { id: 'two-weeks', label: 'In two weeks', date: () => offsetDate(14) },
  { id: 'next-month', label: 'Next month', date: () => offsetDate(30) },
];

export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useNavo();
  const cloud = useCloud();
  const pendingId = useRef(requestId());
  const lock = useRef(false);
  const params = useLocalSearchParams<{ trek?: string | string[] }>();
  const presetTrek = Array.isArray(params.trek) ? params.trek[0] : params.trek;

  const [name, setName] = useState('');
  const [trekId, setTrekId] = useState(presetTrek && trekById(presetTrek) ? presetTrek : treks[0].id);
  const [startDate, setStartDate] = useState(() => nextWeekend(0));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const nameError = validateGroupName(name);
    if (nameError) { setError(nameError); return; }
    if (!userId) { setError('You need to be signed in to create a group.'); return; }
    if (lock.current || !cloud.ready) return;
    lock.current = true;
    setSaving(true); setError(''); Keyboard.dismiss();
    try {
      const group = await cloud.api<{ id: string }>('/groups', { name, trekId, startDate, requestId: pendingId.current });
      router.replace(`/group/${group.id}`);
    } catch (failure) { setError(actionError(failure)); }
    finally { lock.current = false; setSaving(false); }
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Reveal>
        <View style={styles.intro}>
          <Eyebrow>NEW GROUP</Eyebrow>
          <Text style={styles.title}>A circle that hears you.</Text>
          <Text style={styles.subtitle}>Give it a name, tie it to a route, and pick a start date. Invite teammates to share messages, check-ins and in-app alerts.</Text>
        </View>
      </Reveal>

      <Reveal delay={50}>
        <Field
          autoCapitalize="words"
          hint="Something your team will recognise at 3 a.m."
          label="Group name"
          maxLength={40}
          onChangeText={value => { setName(value); setError(''); }}
          placeholder="Annapurna October crew"
          returnKeyType="done"
          value={name}
        />
      </Reveal>

      <Reveal delay={90}>
        <Card style={styles.section}>
          <Eyebrow>ROUTE</Eyebrow>
          <View style={styles.stack}>
            {treks.map(trek => (
              <OptionCard
                detail={`${trek.days} · ${trek.maxElevation.toLocaleString()} m · ${trek.difficulty}`}
                key={trek.id}
                onPress={() => setTrekId(trek.id)}
                selected={trekId === trek.id}
                symbol={String(trek.route.length)}
                title={trek.name}
              />
            ))}
          </View>
        </Card>
      </Reveal>

      <Reveal delay={130}>
        <Card style={styles.section}>
          <Eyebrow>START DATE</Eyebrow>
          <View style={styles.presetRow}>
            {PRESETS.map(preset => (
              <Chip
                key={preset.id}
                label={preset.label}
                onPress={() => setStartDate(preset.date())}
                selected={preset.date() === startDate}
              />
            ))}
          </View>
          <Text style={styles.dateNote}>Departs {formatDate(startDate)}</Text>
        </Card>
      </Reveal>

      <CloudStatus />
      <Notice message={error} />

      <Reveal delay={160}>
        <View style={styles.footer}>
          <Button busy={saving} disabled={saving || !cloud.ready} label={saving ? 'Creating your group…' : 'Create group'} onPress={() => void submit()} />
          <Button label="Cancel" onPress={() => router.back()} style={styles.cancel} variant="quiet" />
        </View>
      </Reveal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 14 },
  intro: { marginBottom: 22 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '700', letterSpacing: -1, lineHeight: 36 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  section: { marginBottom: 16 },
  stack: { gap: 10 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dateNote: { color: colors.lime, fontSize: 14, fontWeight: '700', marginTop: space.md },
  footer: { marginTop: 12 },
  cancel: { marginTop: 4 },
});

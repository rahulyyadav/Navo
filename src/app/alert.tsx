import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, Eyebrow, LinkAction, Notice, Row, useReducedMotion } from '@/components/ui';
import { TabIcon } from '@/components/TabIcon';
import { useNavo } from '@/context/NavoContext';
import { elapsedLabel } from '@/services/format';
import { loadAlerts, saveAlerts } from '@/services/groups';
import { acknowledgeAlert, describeAlert, isAlertActive, resolveAlert } from '@/services/group-model';
import { releaseAlarm, startAlarm, stopAlarm } from '@/services/alerts';
import { useMyLocation } from '@/hooks/useMyLocation';
import type { AlertEvent, AlertKind } from '@/types/navo';
import { colors, radius, space } from '@/theme/tokens';

const DEMO_GROUP = 'demo';
const KINDS: AlertKind[] = ['sos', 'off-route', 'weather', 'check-in'];

function Pulse({ size, delay }: { size: number; delay: number }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    progress.value = withRepeat(withDelay(delay, withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) })), -1, false);
  }, [reduced, delay, progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.5,
    transform: [{ scale: 0.4 + progress.value * 0.85 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { borderRadius: size / 2, height: size, width: size }, animated]} />;
}

function Beat({ children, active }: { children: React.ReactNode; active: boolean }) {
  const reduced = useReducedMotion();
  const beat = useSharedValue(1);
  useEffect(() => {
    if (reduced || !active) { beat.value = 1; return; }
    beat.value = withRepeat(withTiming(1.045, { duration: 420, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduced, active, beat]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: beat.value }] }));
  return <Animated.View style={[styles.beat, animated]}>{children}</Animated.View>;
}

export default function AlertScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ alertId?: string | string[]; groupId?: string | string[]; kind?: string | string[] }>();
  const pick = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');
  const groupId = pick(params.groupId);
  const alertId = pick(params.alertId);
  const requestedKind = pick(params.kind) as AlertKind;
  const kind: AlertKind = KINDS.includes(requestedKind) ? requestedKind : 'sos';

  const { groups, profile, answers, userId } = useNavo();
  const { coords, locate } = useMyLocation();
  const group = groups.find(candidate => candidate.id === groupId) ?? null;
  const demo = groupId === DEMO_GROUP || !group;

  const [stored, setStored] = useState<AlertEvent | null>(null);
  const [override, setOverride] = useState<AlertEvent | null>(null);
  const [storedLoaded, setStoredLoaded] = useState(false);
  const [sounding, setSounding] = useState(false);
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const alertsEnabled = profile?.alertsEnabled ?? answers.alertsEnabled;
  const loaded = demo || storedLoaded;
  useFocusEffect(useCallback(() => { setTick(value => value + 1); }, []));

  useEffect(() => {
    if (demo) return;
    let active = true;
    loadAlerts(groupId)
      .then(list => {
        if (!active) return;
        setOverride(null);
        setStored(list.find(item => item.id === alertId) ?? list.find(isAlertActive) ?? null);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setStoredLoaded(true); });
    return () => { active = false; };
  }, [demo, groupId, alertId, tick]);

  const synthetic = useMemo<AlertEvent>(() => ({
    id: alertId || 'demo',
    groupId: DEMO_GROUP,
    kind,
    message: describeAlert(kind).hint,
    latitude: null,
    longitude: null,
    acknowledgedBy: [],
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  }), [kind, alertId]);

  const alert = override ?? (demo ? synthetic : stored);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = alert ? Math.max(Math.round((now - new Date(alert.createdAt).getTime()) / 1000), 0) : 0;

  useEffect(() => {
    if (!loaded || !alert || !alertsEnabled || muted) return;
    let cancelled = false;
    startAlarm()
      .then(() => { if (!cancelled) setSounding(true); })
      .catch(() => { if (!cancelled) setError('This device blocked the alarm audio. Raise an alert another way.'); });
    return () => { cancelled = true; void releaseAlarm(); setSounding(false); };
  }, [loaded, alert, alertsEnabled, muted]);

  async function persist(next: AlertEvent) {
    setOverride(next);
    if (demo) return;
    const list = await loadAlerts(groupId);
    await saveAlerts(groupId, list.map(item => (item.id === next.id ? next : item)));
  }

  async function acknowledge() {
    if (!alert) return;
    await persist(acknowledgeAlert(alert, userId || 'you'));
  }

  async function clear() {
    if (!alert) return;
    await stopAlarm();
    setSounding(false);
    await persist(resolveAlert(alert));
    router.back();
  }

  async function sound() {
    setMuted(false);
    try {
      await startAlarm();
      setSounding(true);
    } catch {
      setError('This device blocked the alarm audio.');
    }
  }

  async function silence() {
    await stopAlarm();
    setSounding(false);
    setMuted(true);
  }

  const copy = describeAlert(kind);
  const active = alert ? isAlertActive(alert) : false;
  const acknowledged = alert?.acknowledgedBy.includes(userId) ?? false;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[active ? '#3A1512' : '#101A22', colors.nightDeep]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28, paddingTop: insets.top + 18 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable accessibilityLabel="Close alert" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Row gap={space.sm}>
            {demo && <Badge label="PREVIEW" tone="warning" />}
            {active ? <Badge label="LIVE" tone="danger" /> : <Badge label="CLEARED" tone="lime" />}
          </Row>
        </View>

        <View style={styles.stage}>
          <Pulse delay={0} size={340} />
          <Pulse delay={600} size={340} />
          <Pulse delay={1200} size={340} />
          <Beat active={sounding}>
            <View style={[styles.medallion, active && styles.medallionActive]}>
              <TabIcon color={active ? colors.dangerDeep : colors.muted} name="siren" size={46} />
              <Text style={[styles.medallionLabel, active && styles.medallionLabelActive]}>{active ? 'ACTIVE' : 'CLEARED'}</Text>
            </View>
          </Beat>
        </View>

        <View style={styles.copyBlock}>
          <Eyebrow>{copy.label.toUpperCase()} WARNING</Eyebrow>
          <Text style={styles.headline}>{copy.headline}</Text>
          <Text style={styles.message}>{alert?.message ?? copy.hint}</Text>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{elapsedLabel(seconds)}</Text>
            <Text style={styles.metricLabel}>ELAPSED</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{sounding ? 'ON' : muted ? 'MUTED' : alertsEnabled ? 'ARMED' : 'OFF'}</Text>
            <Text style={styles.metricLabel}>SIREN</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{alert?.acknowledgedBy.length ?? 0}</Text>
            <Text style={styles.metricLabel}>ACKNOWLEDGED</Text>
          </View>
        </View>

        <Card style={styles.locationCard}>
          <Row gap={space.md}>
            <TabIcon color={colors.lime} name="pin" size={20} />
            <View style={styles.locationCopy}>
              <Text style={styles.locationTitle}>{coords ? 'Position attached' : 'No position yet'}</Text>
              <Text style={styles.locationDetail}>
                {coords
                  ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}${coords.accuracy ? ` · ±${Math.round(coords.accuracy)} m` : ''}`
                  : 'Get coordinates to read or share from Trail essentials.'}
              </Text>
            </View>
            {!coords && <LinkAction label="Locate" onPress={() => void locate()} />}
          </Row>
        </Card>

        {!alertsEnabled && (
          <Notice message="Loud alerts are switched off in your profile, so this warning is silent. Turn them on to enable the on-device siren." tone="warning" />
        )}
        {error ? <Notice message={error} /> : null}
        {demo && (
          <Notice message="This is a preview raised outside a real group, so it isn’t saved anywhere." tone="info" />
        )}

        <View style={styles.actions}>
          {sounding
            ? <Button icon="■" label="Silence the siren" onPress={() => void silence()} variant="outline" />
            : <Button icon="▶" label="Sound the alarm" onPress={() => void sound()} variant="danger" />}

          {active && (
            <Button
              disabled={acknowledged}
              label={acknowledged ? 'You acknowledged this' : 'Acknowledge'}
              onPress={() => void acknowledge()}
              style={styles.secondary}
              variant="outline"
            />
          )}

          {active && (
            <Button label="Mark as cleared" onPress={() => void clear()} style={styles.secondary} />
          )}
        </View>

        <Text style={styles.footnote}>
          This alarm plays on this device only, at your current media volume. It does not notify teammates or dispatch rescue.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.nightDeep, flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.line, borderRadius: radius.pill, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  closeText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  stage: { alignItems: 'center', height: 340, justifyContent: 'center', marginVertical: 8 },
  ring: { borderColor: 'rgba(255,111,97,0.55)', borderWidth: 2, position: 'absolute' },
  beat: { alignItems: 'center', justifyContent: 'center' },
  medallion: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: colors.line,
    borderRadius: 96,
    borderWidth: 2,
    gap: 10,
    height: 192,
    justifyContent: 'center',
    width: 192,
  },
  medallionActive: { backgroundColor: 'rgba(255,111,97,0.16)', borderColor: 'rgba(255,111,97,0.6)' },
  medallionLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  medallionLabelActive: { color: colors.danger },
  copyBlock: { alignItems: 'center', gap: 10 },
  headline: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.4, lineHeight: 33, textAlign: 'center' },
  message: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  metricRow: { flexDirection: 'row', gap: 10, marginTop: 26 },
  metric: { alignItems: 'center', backgroundColor: 'rgba(25,41,58,0.6)', borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, flex: 1, paddingVertical: 14 },
  metricValue: { color: colors.lime, fontSize: 19, fontWeight: '800' },
  metricLabel: { color: colors.faint, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.1, marginTop: 5 },
  locationCard: { marginTop: 16 },
  locationCopy: { flex: 1 },
  locationTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  locationDetail: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  actions: { gap: 10, marginTop: 24 },
  secondary: { marginTop: 0 },
  footnote: { color: colors.faint, fontSize: 12.5, lineHeight: 19, marginTop: 26, textAlign: 'center' },
});

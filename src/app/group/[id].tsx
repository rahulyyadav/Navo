import { useCallback, useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Avatar, Badge, Button, Card, EmptyState, Eyebrow, Field, LinkAction, Notice, Reveal, Row, SectionTitle, relayout } from '@/components/ui';
import { TabIcon } from '@/components/TabIcon';
import { useNavo } from '@/context/NavoContext';
import { trekById } from '@/data/treks';
import { formatDate, timeAgo } from '@/services/format';
import { loadAlerts, raiseAlert, saveAlerts } from '@/services/groups';
import {
  ALERT_COPY,
  acknowledgeAlert,
  activeMembers,
  describeAlert,
  inviteMember,
  isAlertActive,
  pendingInvites,
  removeMember,
  resolveAlert,
  toggleLeader,
} from '@/services/group-model';
import { useMyLocation } from '@/hooks/useMyLocation';
import type { AlertEvent, AlertKind, TrekGroup } from '@/types/navo';
import { colors, radius, space } from '@/theme/tokens';

const ALERT_ORDER: AlertKind[] = ['sos', 'off-route', 'weather', 'check-in'];

const alertTone = {
  sos: 'danger',
  'off-route': 'warning',
  weather: 'info',
  'check-in': 'neutral',
} as const;

export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const groupId = Array.isArray(params.id) ? params.id[0] ?? '' : params.id ?? '';
  const { groups, updateGroups, userId, email, profile, answers } = useNavo();
  const { coords, locate } = useMyLocation();

  const group = groups.find(candidate => candidate.id === groupId) ?? null;
  const trek = group ? trekById(group.trekId) : null;
  const me = group?.members.find(member => member.id === userId) ?? null;

  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');
  const [raising, setRaising] = useState<AlertKind | null>(null);
  const [tick, setTick] = useState(0);

  useFocusEffect(useCallback(() => { setTick(value => value + 1); }, []));

  useEffect(() => {
    if (!groupId) return;
    let active = true;
    loadAlerts(groupId).then(stored => { if (active) setAlerts(stored); }).catch(() => undefined);
    return () => { active = false; };
  }, [groupId, tick]);

  async function mutateGroup(mutate: (current: TrekGroup) => { group?: TrekGroup; error?: string }) {
    if (!group) return;
    const result = mutate(group);
    if (result.error) { setError(result.error); return; }
    const next = result.group;
    if (!next) return;
    await updateGroups(current => current.map(candidate => (candidate.id === next.id ? next : candidate)));
  }

  async function raise(kind: AlertKind) {
    if (!group || raising) return;
    setRaising(kind);
    setError('');
    try {
      const position = coords ?? (await locate());
      const alert = await raiseAlert({
        groupId: group.id,
        kind,
        message: describeAlert(kind).hint,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
      });
      setAlerts(await loadAlerts(group.id));
      router.push({ pathname: '/alert', params: { alertId: alert.id, groupId: group.id, kind } });
    } catch {
      setError('We couldn’t raise that alert. Try again.');
    } finally {
      setRaising(null);
    }
  }

  async function persist(next: AlertEvent[]) {
    if (!group) return;
    setAlerts(next);
    await saveAlerts(group.id, next);
  }

  function addMember() {
    if (!group) return;
    const result = inviteMember(group, { name: inviteName, email: inviteEmail });
    const next = result.group;
    if (!next) { setError(result.error ?? 'We couldn’t add that person.'); return; }
    setError('');
    setInviteName('');
    setInviteEmail('');
    Keyboard.dismiss();
    void updateGroups(current => current.map(candidate => (candidate.id === next.id ? next : candidate)));
  }

  if (!group) {
    return (
      <EmptyState
        action={<Button label="Back to groups" onPress={() => router.replace('/(tabs)/groups')} variant="outline" />}
        detail="It may have been removed from this device."
        symbol="⛰"
        title="Group not found"
      />
    );
  }

  const crew = activeMembers(group);
  const invites = pendingInvites(group);
  const live = alerts.filter(isAlertActive);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Reveal>
        <Card style={styles.heroCard}>
          <Row gap={space.md} style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupMeta}>{trek ? `${trek.name} · ${trek.region}` : 'Custom route'}</Text>
            </View>
            <View style={styles.avatarStack}>
              {crew.slice(0, 3).map((member, index) => (
                <View key={member.id} style={{ marginLeft: index === 0 ? 0 : -14, zIndex: crew.length - index }}>
                  <Avatar name={member.name} size={40} />
                </View>
              ))}
            </View>
          </Row>

          <Row gap={space.sm} style={styles.heroBadges}>
            <Badge label={`DEPARTS ${formatDate(group.startDate).toUpperCase()}`} tone="lime" />
            <Badge label={`${crew.length} ACTIVE`} tone="neutral" />
            {invites.length > 0 && <Badge label={`${invites.length} INVITED`} tone="info" />}
          </Row>

          {trek && (
            <LinkAction align="left" label="View the route on the map" onPress={() => router.push(`/trek/${trek.id}`)} />
          )}
        </Card>
      </Reveal>

      {live.length > 0 && (
        <Notice message={`${live.length} unresolved ${live.length === 1 ? 'alert' : 'alerts'} in this group. Open one to acknowledge or clear it.`} tone="danger" />
      )}
      <Notice message={error} />

      <Reveal delay={60}>
        <View style={styles.section}>
          <SectionTitle title="ON-DEVICE ALERTS" />
          <Text style={styles.hint}>Local records only. Alerts do not reach other phones or emergency services.</Text>
          <View style={styles.alertGrid}>
            {ALERT_ORDER.map(kind => (
              <Pressable
                accessibilityRole="button"
                disabled={raising !== null}
                key={kind}
                onPress={() => void raise(kind)}
                style={({ pressed }) => [styles.alertTile, kind === 'sos' && styles.alertTileSos, pressed && styles.pressed, raising === kind && styles.pressed]}
              >
                <TabIcon color={kind === 'sos' ? colors.dangerDeep : colors.lime} name={kind === 'sos' ? 'siren' : kind === 'off-route' ? 'route' : kind === 'weather' ? 'compass' : 'pin'} size={22} />
                <Text style={[styles.alertTileLabel, kind === 'sos' && styles.alertTileLabelSos]}>
                  {raising === kind ? 'Raising…' : ALERT_COPY[kind].label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            {coords
              ? `Location attached: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}${coords.accuracy ? ` ±${Math.round(coords.accuracy)} m` : ''}`
              : 'Allow location so every alert carries your coordinates.'}
          </Text>
        </View>
      </Reveal>

      <Reveal delay={90}>
        <View style={styles.section}>
          <SectionTitle
            action={<Text style={styles.countLabel}>{group.members.length}</Text>}
            title="MEMBERS"
          />
          <Animated.View layout={relayout} style={styles.memberList}>
            {group.members.map(member => (
              <Animated.View key={member.id} layout={relayout}>
                <Row gap={space.md} style={styles.memberRow}>
                  <Avatar name={member.name} size={44} />
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>
                      {member.name}{member.id === userId ? ' (you)' : ''}
                    </Text>
                    <Text style={styles.memberEmail} numberOfLines={1}>{member.email ?? 'No email'}</Text>
                  </View>
                  <View style={styles.memberBadges}>
                    {member.role === 'leader' && <Badge label="LEADER" tone="lime" />}
                    {member.status === 'invited' && <Badge label="INVITED" tone="warning" />}
                  </View>
                </Row>

                {me?.role === 'leader' && member.id !== group.ownerId && (
                  <Row gap={space.sm} style={styles.memberActions}>
                    <LinkAction
                      align="left"
                      label={member.role === 'leader' ? 'Remove leader' : 'Make leader'}
                      onPress={() => void mutateGroup(current => toggleLeader(current, member.id))}
                    />
                    <LinkAction
                      align="left"
                      label="Remove"
                      onPress={() => void mutateGroup(current => removeMember(current, member.id))}
                    />
                  </Row>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        </View>
      </Reveal>

      <Reveal delay={120}>
        <Card style={styles.section}>
          <Eyebrow>ADD SOMEONE</Eyebrow>
          <Field
            autoCapitalize="words"
            label="Their name"
            maxLength={60}
            onChangeText={value => { setInviteName(value); setError(''); }}
            placeholder="Pemba Sherpa"
            returnKeyType="next"
            value={inviteName}
          />
          <Field
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            label="Their email"
            maxLength={254}
            onChangeText={value => { setInviteEmail(value); setError(''); }}
            onSubmitEditing={addMember}
            placeholder="pemba@example.com"
            returnKeyType="done"
            textContentType="emailAddress"
            value={inviteEmail}
          />
          <Button icon="+" label="Add to group" onPress={addMember} variant="outline" />
          <Text style={styles.hint}>
            Invites are saved on this device. Navo has no backend yet, so nothing is emailed — share the group name and
            add your teammates on each phone until sync lands.
          </Text>
        </Card>
      </Reveal>

      <Reveal delay={150}>
        <View style={styles.section}>
          <SectionTitle title="ALERT HISTORY" />
          {alerts.length === 0 ? (
            <Text style={styles.emptyLine}>No alerts yet. That’s the goal.</Text>
          ) : (
            <Animated.View layout={relayout} style={styles.alertList}>
              {alerts.map(alert => (
                <Animated.View key={alert.id} layout={relayout}>
                  <Card padded={false} style={styles.alertCard}>
                    <View style={[styles.alertStripe, isAlertActive(alert) && { backgroundColor: colors.dangerDeep }]} />
                    <View style={styles.alertBody}>
                      <Row gap={space.sm}>
                        <Badge label={describeAlert(alert.kind).label.toUpperCase()} tone={alertTone[alert.kind]} />
                        {isAlertActive(alert) ? <Badge label="LIVE" tone="danger" /> : <Badge label="CLEARED" tone="lime" />}
                      </Row>
                      <Text style={styles.alertHeadline}>{describeAlert(alert.kind).headline}</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertMeta}>
                        {timeAgo(alert.createdAt)}
                        {alert.latitude !== null && alert.longitude !== null ? ` · ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}` : ' · no location'}
                        {alert.acknowledgedBy.length > 0 ? ` · ${alert.acknowledgedBy.length} acknowledged` : ''}
                      </Text>
                      <Row gap={space.sm} style={styles.alertActions}>
                        {isAlertActive(alert) && !alert.acknowledgedBy.includes(userId) && (
                          <LinkAction
                            align="left"
                            label="Acknowledge"
                            onPress={() => void persist(alerts.map(item => (item.id === alert.id ? acknowledgeAlert(item, userId) : item)))}
                          />
                        )}
                        {isAlertActive(alert) && (
                          <LinkAction
                            align="left"
                            label="Mark cleared"
                            onPress={() => void persist(alerts.map(item => (item.id === alert.id ? resolveAlert(item) : item)))}
                          />
                        )}
                        <LinkAction align="left" label="Open full screen" onPress={() => router.push({ pathname: '/alert', params: { alertId: alert.id, groupId: group.id, kind: alert.kind } })} />
                      </Row>
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </Animated.View>
          )}
        </View>
      </Reveal>

      <Reveal delay={180}>
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Signed in as {profile?.fullName ?? answers.fullName} · {email}
          </Text>
          <Button
            label="Leave group"
            onPress={() => { void updateGroups(current => current.filter(candidate => candidate.id !== group.id)).then(() => router.replace('/(tabs)/groups')); }}
            variant="danger"
          />
        </View>
      </Reveal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 44, paddingHorizontal: 20, paddingTop: 12 },
  heroCard: { borderColor: colors.line },
  heroTop: { alignItems: 'center' },
  heroCopy: { flex: 1 },
  groupName: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.7, lineHeight: 30 },
  groupMeta: { color: colors.muted, fontSize: 13.5, marginTop: 6 },
  avatarStack: { flexDirection: 'row' },
  heroBadges: { flexWrap: 'wrap', marginTop: 16 },
  section: { marginTop: 28 },
  alertGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  alertTile: {
    alignItems: 'flex-start',
    backgroundColor: colors.navy,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    minHeight: 96,
    padding: 14,
    width: '47%',
  },
  alertTileSos: { backgroundColor: 'rgba(255,111,97,0.14)', borderColor: 'rgba(255,111,97,0.42)' },
  alertTileLabel: { color: colors.ink, fontSize: 14.5, fontWeight: '800', letterSpacing: 0.3 },
  alertTileLabelSos: { color: colors.danger },
  hint: { color: colors.faint, fontSize: 12.5, lineHeight: 18, marginTop: 12 },
  memberList: { gap: 4 },
  memberRow: { paddingVertical: 10 },
  memberCopy: { flex: 1 },
  memberName: { color: colors.ink, fontSize: 15.5, fontWeight: '700' },
  memberEmail: { color: colors.faint, fontSize: 12.5, marginTop: 3 },
  memberBadges: { alignItems: 'flex-end', gap: 6 },
  memberActions: { justifyContent: 'flex-start', paddingBottom: 8, paddingLeft: 60 },
  countLabel: { color: colors.lime, fontSize: 13, fontWeight: '800' },
  emptyLine: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  alertList: { gap: 10 },
  alertCard: { flexDirection: 'row', overflow: 'hidden' },
  alertStripe: { backgroundColor: colors.lineSoft, width: 4 },
  alertBody: { flex: 1, padding: 16 },
  alertHeadline: { color: colors.ink, fontSize: 15, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  alertMessage: { color: colors.muted, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  alertMeta: { color: colors.faint, fontSize: 12, marginTop: 8 },
  alertActions: { flexWrap: 'wrap', marginTop: 2 },
  footer: { marginTop: 32 },
  footerNote: { color: colors.faint, fontSize: 12.5, lineHeight: 18, marginBottom: 14 },
  pressed: { opacity: 0.6 },
});

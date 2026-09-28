import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Backdrop, Badge, Button, Card, EmptyState, Eyebrow, Notice, Reveal, Row, SectionTitle, relayout } from '@/components/ui';
import { TabIcon } from '@/components/TabIcon';
import { useNavo } from '@/context/NavoContext';
import { trekById } from '@/data/treks';
import { loadAlerts } from '@/services/groups';
import { activeMembers, isAlertActive, pendingInvites } from '@/services/group-model';
import { formatDate } from '@/services/format';
import { colors, radius, space } from '@/theme/tokens';

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const { groups, profile, answers } = useNavo();
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);

  useFocusEffect(useCallback(() => { setTick(value => value + 1); }, []));

  useEffect(() => {
    let active = true;
    (async () => {
      const entries = await Promise.all(groups.map(async group => {
        const alerts = await loadAlerts(group.id);
        return [group.id, alerts.filter(isAlertActive).length] as const;
      }));
      if (active) setAlertCounts(Object.fromEntries(entries));
    })();
    return () => { active = false; };
  }, [groups, tick]);

  const alertsEnabled = profile?.alertsEnabled ?? answers.alertsEnabled;
  const firstName = (profile?.fullName ?? answers.fullName).split(/\s+/).filter(Boolean)[0] ?? 'your';

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Reveal>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Eyebrow>GROUP SAFETY</Eyebrow>
              <Text style={styles.title}>{firstName} circle</Text>
              <Text style={styles.subtitle}>Organise your team in a local roster. Group records and alarms are stored on this device.</Text>
            </View>
          </View>
        </Reveal>

        {!alertsEnabled && (
          <Reveal delay={50}>
            <Notice message="On-device sound is off. You can enable it in your profile." tone="warning" />
          </Reveal>
        )}

        <Reveal delay={80}>
          <Button icon="+" label="Create a group" onPress={() => router.push('/group/new')} style={styles.createButton} />
        </Reveal>

        {groups.length === 0 ? (
          <EmptyState
            action={<Button label="Start your first group" onPress={() => router.push('/group/new')} variant="outline" />}
            detail="Groups are stored on this device for now, so your team appears on any phone you sign in to only after you add them there."
            symbol="⛰"
            title="No group yet"
          />
        ) : (
          <Animated.View layout={relayout} style={styles.list}>
            <SectionTitle title={`${groups.length} ${groups.length === 1 ? 'GROUP' : 'GROUPS'}`} />
            {groups.map(group => {
              const trek = trekById(group.trekId);
              const live = alertCounts[group.id] ?? 0;
              const crew = activeMembers(group);
              const invites = pendingInvites(group);
              return (
                <Animated.View key={group.id} layout={relayout}>
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/group/${group.id}`)} style={({ pressed }) => [pressed && styles.pressed]}>
                    <Card style={styles.groupCard}>
                      <Row gap={space.md} style={styles.groupTop}>
                        <View style={styles.groupCopy}>
                          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                          <Text style={styles.groupMeta} numberOfLines={1}>
                            {trek ? `${trek.name} · ${trek.region}` : 'Custom route'} · {formatDate(group.startDate)}
                          </Text>
                        </View>
                        {live > 0
                          ? <Badge label={live === 1 ? '1 LIVE ALERT' : `${live} LIVE ALERTS`} tone="danger" />
                          : <Badge label="ALL CLEAR" tone="lime" />}
                      </Row>

                      <View style={styles.memberRow}>
                        <View style={styles.avatarStack}>
                          {crew.slice(0, 5).map((member, index) => (
                            <View key={member.id} style={{ marginLeft: index === 0 ? 0 : -12, zIndex: crew.length - index }}>
                              <Avatar name={member.name} size={38} />
                            </View>
                          ))}
                        </View>
                        <View style={styles.memberMeta}>
                          <Text style={styles.memberCount}>{crew.length} {crew.length === 1 ? 'member' : 'members'}</Text>
                          {invites.length > 0 && <Text style={styles.inviteCount}>{invites.length} invited</Text>}
                        </View>
                        <Pressable
                          accessibilityLabel={`Raise an emergency in ${group.name}`}
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={() => router.push({ pathname: '/alert', params: { groupId: group.id, kind: 'sos' } })}
                          style={({ pressed }) => [styles.sosButton, pressed && styles.pressed]}
                        >
                          <TabIcon color={colors.dangerDeep} name="siren" size={20} />
                          <Text style={styles.sosText}>SOS</Text>
                        </Pressable>
                      </View>
                    </Card>
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        <Reveal delay={120}>
          <Card style={styles.benefitCard}>
            <Eyebrow>WHY A GROUP HELPS</Eyebrow>
            <View style={styles.benefitRow}>
              <TabIcon color={colors.lime} name="siren" size={20} />
              <Text style={styles.benefitText}>An on-device siren. Volume depends on your phone settings; it does not notify the group.</Text>
            </View>
            <View style={styles.benefitRow}>
              <TabIcon color={colors.lime} name="pin" size={20} />
              <Text style={styles.benefitText}>Your last known coordinates attach to every alert you raise.</Text>
            </View>
            <View style={styles.benefitRow}>
              <TabIcon color={colors.lime} name="route" size={20} />
              <Text style={styles.benefitText}>Off-route and missed check-in warnings keep the group honest.</Text>
            </View>
          </Card>
        </Reveal>
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40, paddingHorizontal: 20 },
  header: { flexDirection: 'row' },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '700', letterSpacing: -1, lineHeight: 36 },
  subtitle: { color: colors.muted, fontSize: 14.5, lineHeight: 22, marginTop: 10 },
  createButton: { marginTop: 22 },
  list: { gap: 12, marginTop: 28 },
  groupCard: { borderColor: colors.line },
  groupTop: { alignItems: 'flex-start' },
  groupCopy: { flex: 1 },
  groupName: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  groupMeta: { color: colors.muted, fontSize: 13, marginTop: 5 },
  memberRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 16 },
  avatarStack: { flexDirection: 'row' },
  memberMeta: { flex: 1 },
  memberCount: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  inviteCount: { color: colors.faint, fontSize: 12, marginTop: 2 },
  sosButton: { alignItems: 'center', borderColor: 'rgba(255,111,97,0.45)', borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', gap: 7, paddingHorizontal: 13, paddingVertical: 10 },
  sosText: { color: colors.danger, fontSize: 12.5, fontWeight: '900', letterSpacing: 1 },
  benefitCard: { marginTop: 26 },
  benefitRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginTop: 14 },
  benefitText: { color: colors.muted, flex: 1, fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.7 },
});

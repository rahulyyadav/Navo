import { useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  Backdrop,
  Badge,
  Button,
  Card,
  Eyebrow,
  Field,
  LinkAction,
  Notice,
  Reveal,
  Row,
  SectionTitle,
  Stat,
} from '@/components/ui';
import { TabIcon } from '@/components/TabIcon';
import { useNavo } from '@/context/NavoContext';
import { goalLabels, levelLabel } from '@/data/onboarding';
import { treks } from '@/data/treks';
import { releaseAlarm, startAlarm } from '@/services/alerts';
import { friendlyAuthError } from '@/services/auth-errors';
import { formatDate } from '@/services/format';
import { colors, radius, space } from '@/theme/tokens';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { answers, groups, email, imageUrl, profile, signOut, signingOut, updateAnswers } = useNavo();
  const [loud, setLoud] = useState(answers.alertsEnabled);
  const [contact, setContact] = useState(() => ({
    name: answers.emergencyContact?.name ?? '',
    phone: answers.emergencyContact?.phone ?? '',
  }));
  const [savingContact, setSavingContact] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => { void releaseAlarm(); }, []);

  const name = answers.fullName.trim() || profile?.fullName || 'Trekker';
  const goals = goalLabels(answers.goals);
  const saved = contact.name === (answers.emergencyContact?.name ?? '')
    && contact.phone === (answers.emergencyContact?.phone ?? '');

  async function toggleLoud(value: boolean) {
    setLoud(value);
    setError('');
    try {
      await updateAnswers({ alertsEnabled: value });
    } catch (failure) {
      setLoud(!value);
      setError(friendlyAuthError(failure, 'We couldn’t save that change.'));
    }
  }

  async function saveContact() {
    Keyboard.dismiss();
    const trimmedName = contact.name.trim();
    const trimmedPhone = contact.phone.trim();
    if (!trimmedName && trimmedPhone) { setError('Add a name so your group knows who to call.'); return; }
    if (trimmedName && trimmedPhone && trimmedPhone.replace(/\D/g, '').length < 7) {
      setError('That phone number looks too short. Include the country code.');
      return;
    }
    setSavingContact(true);
    setError('');
    try {
      await updateAnswers({
        emergencyContact: trimmedName ? { name: trimmedName, phone: trimmedPhone } : null,
      });
    } catch (failure) {
      setError(friendlyAuthError(failure, 'We couldn’t save that contact.'));
    } finally {
      setSavingContact(false);
    }
  }

  async function testAlarm() {
    if (testing) { setTesting(false); await releaseAlarm(); return; }
    setTesting(true);
    setError('');
    try {
      await startAlarm();
      setTimeout(() => { void releaseAlarm(); setTesting(false); }, 3500);
    } catch (failure) {
      setTesting(false);
      setError(friendlyAuthError(failure, 'We couldn’t play the alarm on this device.'));
    }
  }

  async function redoSetup() {
    setError('');
    try {
      await updateAnswers({ completed: false });
    } catch (failure) {
      setError(friendlyAuthError(failure, 'We couldn’t open the setup steps.'));
    }
  }

  async function leave() {
    setError('');
    try {
      await signOut();
    } catch (failure) {
      setError(friendlyAuthError(failure, 'We couldn’t sign you out. Please try again.'));
    }
  }

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Reveal>
          <View style={styles.identity}>
            <Avatar name={name} size={84} uri={imageUrl} />
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email} numberOfLines={1}>{email}</Text>
            <View style={styles.badges}>
              <Badge label={levelLabel(answers.level).toUpperCase()} tone="lime" />
              {profile?.createdAt ? <Badge label={`JOINED ${formatDate(profile.createdAt).toUpperCase()}`} /> : null}
            </View>
          </View>
        </Reveal>

        <Reveal delay={60}>
          <Card style={styles.statCard}>
            <Row>
              <Stat label="GROUPS" value={String(groups.length)} />
              <View style={styles.statDivider} />
              <Stat label="ROUTES MAPPED" value={String(treks.length)} />
              <View style={styles.statDivider} />
              <Stat label="LOUD ALERTS" value={loud ? 'ON' : 'OFF'} />
            </Row>
          </Card>
        </Reveal>

        <Notice message={error} />

        <Reveal delay={90}>
          <View style={styles.section}>
            <SectionTitle title="SAFETY" />
            <Card>
              <Row style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.cardTitle}>Full-volume warnings</Text>
                  <Text style={styles.cardDetail}>
                    Group alerts ignore the silent switch and interrupt other audio.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Enable loud group alerts"
                  onValueChange={value => void toggleLoud(value)}
                  thumbColor={loud ? colors.onAccent : colors.faint}
                  trackColor={{ false: colors.slate, true: colors.lime }}
                  value={loud}
                />
              </Row>
              <View style={styles.switchActions}>
                <Button
                  disabled={!loud}
                  icon={testing ? '■' : '▶'}
                  label={testing ? 'Stop the test alarm' : 'Test the alarm'}
                  onPress={() => void testAlarm()}
                  variant="outline"
                />
                {!loud
                  ? <Text style={styles.hint}>Turn alerts on to test the siren.</Text>
                  : <Text style={styles.hint}>Volume is still capped by your hardware buttons — keep them up.</Text>}
              </View>
            </Card>

            <Card style={styles.contactCard}>
              <Eyebrow>EMERGENCY CONTACT</Eyebrow>
              <Field
                autoCapitalize="words"
                autoComplete="name"
                label="Who should we tell?"
                maxLength={60}
                onChangeText={value => { setContact(current => ({ ...current, name: value })); setError(''); }}
                placeholder="Pemba Sherpa"
                returnKeyType="next"
                textContentType="name"
                value={contact.name}
              />
              <Field
                autoComplete="tel"
                hint="Include the country code — Nepali numbers start with +977."
                keyboardType="phone-pad"
                label="Phone"
                maxLength={24}
                onChangeText={value => { setContact(current => ({ ...current, phone: value })); setError(''); }}
                placeholder="+977 98…"
                returnKeyType="done"
                textContentType="telephoneNumber"
                value={contact.phone}
              />
              <Row gap={space.sm} style={styles.contactActions}>
                <Button busy={savingContact} disabled={saved} label={saved ? 'Saved' : 'Save contact'} onPress={() => void saveContact()} style={styles.flex} />
                {!saved && contact.name.trim() === '' && contact.phone.trim() === '' ? null : (
                  <LinkAction align="right" disabled={saved || savingContact} label="Clear" onPress={() => { setContact({ name: '', phone: '' }); setError(''); }} />
                )}
              </Row>
            </Card>
          </View>
        </Reveal>

        <Reveal delay={120}>
          <View style={styles.section}>
            <SectionTitle
              action={<LinkAction align="right" label="Edit setup" onPress={() => void redoSetup()} />}
              title="YOUR SETUP"
            />
            <Card>
              <View style={styles.setupRow}>
                <Text style={styles.setupLabel}>Experience</Text>
                <Text style={styles.setupValue}>{levelLabel(answers.level)}</Text>
              </View>
              <View style={styles.setupRow}>
                <Text style={styles.setupLabel}>Chasing</Text>
                <View style={styles.goalRow}>
                  {goals.length > 0
                    ? goals.map(goal => <Badge key={goal} label={goal} tone="lime" />)
                    : <Text style={styles.setupMuted}>Nothing picked yet</Text>}
                </View>
              </View>
              {answers.completedAt ? (
                <View style={styles.setupRow}>
                  <Text style={styles.setupLabel}>Set up</Text>
                  <Text style={styles.setupValue}>{formatDate(answers.completedAt)}</Text>
                </View>
              ) : null}
            </Card>
          </View>
        </Reveal>

        <Reveal delay={150}>
          <View style={styles.section}>
            <SectionTitle title="EXPLORE" />
            <View style={styles.links}>
              <LinkRow detail="See all four mapped routes across Nepal." icon="map" label="Nepal map" onPress={() => router.push('/(tabs)/map')} />
              <LinkRow detail="How Navo structures a day-by-day trek." icon="route" label="Sample plan" onPress={() => router.push('/plan')} />
              <LinkRow detail="What to carry past the last signal." icon="compass" label="Offline essentials" onPress={() => router.push('/safety')} />
              <LinkRow detail="Create one and share a single loud alarm." icon="group" label="Start a group" onPress={() => router.push('/group/new')} />
            </View>
          </View>
        </Reveal>

        <View style={styles.section}>
          <Button busy={signingOut} label={signingOut ? 'Signing out…' : 'Sign out'} onPress={() => void leave()} variant="danger" />
          <Text style={styles.footnote}>
            Navo keeps your profile, groups, and alerts on this device. Signing out leaves them here, so the next
            sign-in with this account picks up where you stopped.
          </Text>
        </View>
      </ScrollView>
    </Backdrop>
  );
}

function LinkRow({ label, detail, icon, onPress }: { label: string; detail: string; icon: 'map' | 'route' | 'compass' | 'group'; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
      <View style={styles.linkIcon}><TabIcon color={colors.lime} name={icon} size={20} /></View>
      <View style={styles.linkCopy}>
        <Text style={styles.linkTitle}>{label}</Text>
        <Text style={styles.linkDetail}>{detail}</Text>
      </View>
      <Text style={styles.linkArrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40, paddingHorizontal: 20 },
  flex: { flex: 1 },
  identity: { alignItems: 'center', gap: 8, paddingTop: 8 },
  name: { color: colors.ink, fontSize: 26, fontWeight: '700', letterSpacing: -0.7, marginTop: 6 },
  email: { color: colors.muted, fontSize: 14 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 },
  statCard: { marginTop: 22 },
  statDivider: { backgroundColor: colors.line, height: 34, width: 1 },
  section: { marginTop: 28 },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  cardDetail: { color: colors.muted, fontSize: 13.5, lineHeight: 20, marginTop: 5 },
  switchRow: { alignItems: 'flex-start', gap: space.md },
  switchCopy: { flex: 1 },
  switchActions: { gap: 10, marginTop: 18 },
  hint: { color: colors.faint, fontSize: 12.5, lineHeight: 18 },
  contactCard: { marginTop: 12 },
  contactActions: { alignItems: 'center', marginTop: 4 },
  setupRow: { alignItems: 'flex-start', flexDirection: 'row', gap: space.md, paddingVertical: 9 },
  setupLabel: { color: colors.faint, fontSize: 12, fontWeight: '800', letterSpacing: 1, width: 92 },
  setupValue: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  setupMuted: { color: colors.muted, fontSize: 14 },
  goalRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  links: { backgroundColor: colors.navy, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  linkRow: { alignItems: 'center', borderBottomColor: colors.lineSoft, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 68, paddingHorizontal: 16, paddingVertical: 13 },
  linkIcon: { alignItems: 'center', backgroundColor: colors.slate, borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  linkCopy: { flex: 1 },
  linkTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  linkDetail: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  linkArrow: { color: colors.faint, fontSize: 20 },
  pressed: { opacity: 0.7 },
  footnote: { color: colors.faint, fontSize: 12.5, lineHeight: 19, marginTop: 14, textAlign: 'center' },
});

import { useEffect, useMemo, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop, Button, Card, Chip, Eyebrow, Field, Heading, LinkAction, Notice, OptionCard, Row } from '@/components/ui';
import { useFirebaseAuth } from '@/context/AuthContext';
import { useNavo } from '@/context/NavoContext';
import { GOALS, LEVELS, MAX_GOALS, goalLabels, levelLabel } from '@/data/onboarding';
import { emptyOnboarding } from '@/services/profile';
import { releaseAlarm, startAlarm } from '@/services/alerts';
import { friendlyAuthError } from '@/services/auth-errors';
import type { OnboardingAnswers } from '@/types/navo';
import { colors, radius, space } from '@/theme/tokens';

const STEPS = ['name', 'level', 'goals', 'contact', 'alerts', 'ready'] as const;
type Step = (typeof STEPS)[number];

const STEP_COPY: Record<Step, { eyebrow: string; title: string; subtitle: string }> = {
  name: { eyebrow: 'STEP 1 OF 5', title: 'What should the trail call you?', subtitle: 'Your group sees this name when you raise an alert.' },
  level: { eyebrow: 'STEP 2 OF 5', title: 'How far have you walked?', subtitle: 'Navo uses this to judge how hard each day will feel.' },
  goals: { eyebrow: 'STEP 3 OF 5', title: 'What are you chasing?', subtitle: `Pick up to ${MAX_GOALS}. These shape the routes we suggest first.` },
  contact: { eyebrow: 'STEP 4 OF 5', title: 'Who should we tell?', subtitle: 'An emergency contact back home. Optional, but it matters above 4,000 m.' },
  alerts: { eyebrow: 'STEP 5 OF 5', title: 'Turn on the loud alarm', subtitle: 'Choose whether to play an on-device warning sound. Volume depends on your phone settings.' },
  ready: { eyebrow: 'YOU’RE SET', title: 'Ready when you are.', subtitle: 'Here’s what Navo now knows about you.' },
};

export default function WelcomeScreen() {
  const { user } = useFirebaseAuth();
  const { completeOnboarding, email, answers } = useNavo();
  const [step, setStep] = useState<Step>('name');
  const [draft, setDraft] = useState<OnboardingAnswers>(() => {
    // Re-entering from Profile keeps the saved answers instead of starting blank.
    if (answers.completed) return { ...answers, completed: false };
    const known = user?.displayName?.trim() ?? '';
    return known ? { ...emptyOnboarding, fullName: known } : emptyOnboarding;
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => () => { void releaseAlarm(); }, []);

  const index = STEPS.indexOf(step);
  const progress = useMemo(() => (index / (STEPS.length - 1)) * 100, [index]);
  const copy = STEP_COPY[step];

  function patch(next: Partial<OnboardingAnswers>) {
    setDraft(current => ({ ...current, ...next }));
    setError('');
  }

  function toggleGoal(id: string) {
    setDraft(current => {
      const has = current.goals.includes(id);
      if (!has && current.goals.length >= MAX_GOALS) return current;
      return { ...current, goals: has ? current.goals.filter(goal => goal !== id) : [...current.goals, id] };
    });
    setError('');
  }

  function canContinue(): string {
    if (step === 'name' && draft.fullName.trim().length < 2) return 'Enter the name your group should see.';
    if (step === 'level' && !draft.level) return 'Pick the option closest to your experience.';
    if (step === 'goals' && draft.goals.length === 0) return 'Pick at least one thing you’re chasing.';
    return '';
  }

  function next() {
    const blocked = canContinue();
    if (blocked) { setError(blocked); return; }
    Keyboard.dismiss();
    setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  }

  function back() {
    Keyboard.dismiss();
    setError('');
    setStep(STEPS[Math.max(index - 1, 0)]);
  }

  async function testAlarm() {
    if (testing) { setTesting(false); await releaseAlarm(); return; }
    setTesting(true);
    try {
      await startAlarm();
      setTimeout(() => { void releaseAlarm(); setTesting(false); }, 3500);
    } catch (failure) {
      setTesting(false);
      setError(friendlyAuthError(failure, 'We couldn’t play the alarm on this device.'));
    }
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    setError('');
    await releaseAlarm();
    try {
      await completeOnboarding(draft);
      router.replace('/(tabs)/discover');
    } catch (failure) {
      setError(friendlyAuthError(failure, 'We couldn’t save your answers. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  const name = draft.fullName.trim() || 'trekker';

  return (
    <Backdrop>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.progressWrap}>
          <Row style={styles.progressTop}>
            <Text style={styles.progressLabel}>{copy.eyebrow}</Text>
            {index > 0 && step !== 'ready'
              ? <LinkAction align="right" label="Back" onPress={back} />
              : <View style={styles.progressSpacer} />}
          </Row>
          <View style={styles.track}>
            <Animated.View layout={LinearTransition.springify().damping(20)} style={[styles.fill, { width: `${Math.max(progress, 4)}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInRight.duration(360).springify().damping(18)} exiting={FadeOutLeft.duration(180)} key={step}>
            <Heading subtitle={copy.subtitle} title={copy.title} />

            {step === 'name' && (
              <Field
                autoCapitalize="words"
                autoComplete="name"
                autoFocus
                hint={`Signed in as ${email || 'your account'}.`}
                label="Your name"
                maxLength={100}
                onChangeText={value => patch({ fullName: value })}
                onSubmitEditing={next}
                placeholder="Aasha Gurung"
                returnKeyType="done"
                textContentType="name"
                value={draft.fullName}
              />
            )}

            {step === 'level' && (
              <View style={styles.stack}>
                {LEVELS.map(level => (
                  <OptionCard
                    detail={level.detail}
                    key={level.id}
                    onPress={() => patch({ level: level.id })}
                    selected={draft.level === level.id}
                    symbol={level.symbol}
                    title={level.label}
                  />
                ))}
              </View>
            )}

            {step === 'goals' && (
              <View>
                <View style={styles.chips}>
                  {GOALS.map(goal => (
                    <Chip
                      disabled={!draft.goals.includes(goal.id) && draft.goals.length >= MAX_GOALS}
                      key={goal.id}
                      label={goal.label}
                      onPress={() => toggleGoal(goal.id)}
                      selected={draft.goals.includes(goal.id)}
                    />
                  ))}
                </View>
                <Text style={styles.counter}>{draft.goals.length} of {MAX_GOALS} chosen</Text>
              </View>
            )}

            {step === 'contact' && (
              <View>
                <Field
                  autoCapitalize="words"
                  autoComplete="name"
                  hint="Someone who would notice if you went quiet."
                  label="Contact name"
                  maxLength={60}
                  onChangeText={value => patch({ emergencyContact: { name: value, phone: draft.emergencyContact?.phone ?? '' } })}
                  placeholder="Pemba Sherpa"
                  returnKeyType="next"
                  textContentType="name"
                  value={draft.emergencyContact?.name ?? ''}
                />
                <Field
                  autoComplete="tel"
                  hint="Include the country code — Nepali numbers start with +977."
                  keyboardType="phone-pad"
                  label="Contact phone"
                  maxLength={24}
                  onChangeText={value => patch({ emergencyContact: { name: draft.emergencyContact?.name ?? '', phone: value } })}
                  placeholder="+977 98…"
                  returnKeyType="done"
                  textContentType="telephoneNumber"
                  value={draft.emergencyContact?.phone ?? ''}
                />
                <Text style={styles.skipNote}>You can skip this and add it later from your profile.</Text>
              </View>
            )}

            {step === 'alerts' && (
              <View style={styles.stack}>
                <Card>
                  <Row style={styles.alertRow}>
                    <View style={styles.alertCopy}>
                      <Eyebrow>FULL-VOLUME WARNING</Eyebrow>
                      <Text style={styles.alertTitle}>Sirens your whole group can hear</Text>
                      <Text style={styles.alertDetail}>
                        Navo can play a siren and haptics on this phone. Test it at a comfortable volume. Alerts do not notify teammates or emergency services.
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel="Enable loud group alerts"
                      onValueChange={value => patch({ alertsEnabled: value })}
                      thumbColor={draft.alertsEnabled ? colors.onAccent : colors.faint}
                      trackColor={{ false: colors.slate, true: colors.lime }}
                      value={draft.alertsEnabled}
                    />
                  </Row>
                </Card>
                <Button
                  busy={false}
                  disabled={!draft.alertsEnabled}
                  icon={testing ? '■' : '▶'}
                  label={testing ? 'Stop the test alarm' : 'Test the alarm'}
                  onPress={() => void testAlarm()}
                  variant="outline"
                />
                <Text style={styles.skipNote}>Keep your phone volume up. Test it once now so nobody panics later.</Text>
              </View>
            )}

            {step === 'ready' && (
              <View style={styles.stack}>
                <Card>
                  <Row gap={space.md}>
                    <Text style={styles.summaryLabel}>Name</Text>
                    <Text style={styles.summaryValue}>{name}</Text>
                  </Row>
                  <Row gap={space.md}>
                    <Text style={styles.summaryLabel}>Level</Text>
                    <Text style={styles.summaryValue}>{levelLabel(draft.level)}</Text>
                  </Row>
                  <Row gap={space.md}>
                    <Text style={styles.summaryLabel}>Goals</Text>
                    <Text style={styles.summaryValue}>{goalLabels(draft.goals).join(' · ') || 'None yet'}</Text>
                  </Row>
                  <Row gap={space.md}>
                    <Text style={styles.summaryLabel}>Contact</Text>
                    <Text style={styles.summaryValue}>{draft.emergencyContact?.name.trim() ? `${draft.emergencyContact.name.trim()} · ${draft.emergencyContact.phone.trim() || 'no phone'}` : 'Not added'}</Text>
                  </Row>
                  <Row gap={space.md}>
                    <Text style={styles.summaryLabel}>Loud alerts</Text>
                    <Text style={styles.summaryValue}>{draft.alertsEnabled ? 'On' : 'Off'}</Text>
                  </Row>
                </Card>
                <Text style={styles.skipNote}>You can change any of this later from the Profile tab.</Text>
              </View>
            )}

            <Notice message={error} />
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {step === 'ready'
            ? <Button busy={saving} label={saving ? 'Setting up Navo…' : `Start exploring, ${name}`} onPress={() => void finish()} />
            : <Button label={step === 'alerts' ? 'See my summary' : 'Continue'} onPress={next} />}
          {step === 'contact' && (
            <LinkAction disabled={saving} label="Skip for now" onPress={() => setStep('alerts')} />
          )}
        </View>
      </SafeAreaView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progressWrap: { paddingHorizontal: 22, paddingTop: 14 },
  progressTop: { alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  progressSpacer: { height: 48 },
  track: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: radius.pill, height: 5, marginTop: 12, overflow: 'hidden' },
  fill: { backgroundColor: colors.lime, borderRadius: radius.pill, height: 5 },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 26 },
  stack: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  counter: { color: colors.faint, fontSize: 13, marginTop: 16 },
  skipNote: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  alertRow: { alignItems: 'flex-start', gap: space.md },
  alertCopy: { flex: 1 },
  alertTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  alertDetail: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  summaryLabel: { color: colors.faint, fontSize: 12, fontWeight: '800', letterSpacing: 1, width: 96 },
  summaryValue: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  footer: { gap: 4, paddingHorizontal: 22, paddingBottom: 10, paddingTop: 12 },
});

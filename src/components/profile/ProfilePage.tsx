import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, Switch, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { Text, TextInput } from '@/components/Typography';
import { TabIcon } from '@/components/TabIcon';
import { HomePressable } from '@/components/journeys/HomeMotion';
import { useNavo } from '@/context/NavoContext';
import { useFirebaseAuth } from '@/context/AuthContext';
import { GOALS, LEVELS, MAX_GOALS, goalLabels, levelLabel } from '@/data/onboarding';
import { startAlarm, releaseAlarm } from '@/services/alerts';
import { friendlyAuthError } from '@/services/auth-errors';
import { profileDetails } from '@/services/profile-details';
import type { OnboardingAnswers } from '@/types/navo';
import { ProfileCard } from './ProfileCard';
import { useProfileStyles } from './profile-styles';
import { useTheme } from '@/context/ThemeContext';
import { AppearanceSetting } from './AppearanceSetting';

const enter = FadeInDown.duration(380).reduceMotion(ReduceMotion.System);
const layout = LinearTransition.duration(220).reduceMotion(ReduceMotion.System);
type Section = 'details' | 'preferences' | null;

export function ProfilePage() {
  const s = useProfileStyles();
  const { palette, scheme } = useTheme();
  const green = palette.green;
  useFocusEffect(useCallback(() => { StatusBar.setStyle(scheme === 'dark' ? 'light' : 'dark'); }, [scheme]));
  const { answers, profile, email, updateAnswers, signOut, signingOut, hydrated } = useNavo();
  const { user } = useFirebaseAuth();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>(null);
  const [draft, setDraft] = useState({ name: '', contactName: '', phone: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [testing, setTesting] = useState(false);
  const lock = useRef(false);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownName = answers.fullName.trim() || profile?.fullName || user?.displayName || '';
  const name = knownName || 'Your name';
  const contact = answers.emergencyContact;
  const disabled = Boolean(busy) || signingOut || !hydrated;

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => {
      focused.current = false;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      void releaseAlarm();
      setTesting(false);
    };
  }, []));

  async function save(patch: Partial<OnboardingAnswers>, key: string) {
    if (lock.current || !hydrated || signingOut) return;
    if (!patch.fullName && knownName.trim().length < 2) {
      setDraft({ name: knownName, contactName: contact?.name || '', phone: contact?.phone || '' });
      setSection('details'); setError('Add your name in Your details before saving preferences.');
      return;
    }
    lock.current = true; setBusy(key); setError(''); setNotice('');
    try {
      await updateAnswers({ ...patch, fullName: patch.fullName || knownName.trim() });
      setNotice('Your changes are saved.');
      if (key === 'details') setSection(null);
    } catch (failure) { setError(friendlyAuthError(failure, 'Could not save your changes. Please try again.')); }
    finally { lock.current = false; setBusy(''); }
  }
  function openDetails() {
    Keyboard.dismiss(); setError(''); setNotice('');
    if (section === 'details') { setSection(null); return; }
    setDraft({ name: knownName, contactName: contact?.name || '', phone: contact?.phone || '' });
    setSection('details');
  }
  function saveDetails() {
    Keyboard.dismiss();
    try { void save(profileDetails(draft), 'details'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check your details and try again.'); }
  }
  async function testAlarm() {
    setError('');
    if (testing) { if (timer.current) clearTimeout(timer.current); timer.current = null; setTesting(false); await releaseAlarm(); return; }
    setTesting(true);
    try {
      await startAlarm();
      if (!focused.current) { await releaseAlarm(); return; }
      timer.current = setTimeout(() => { void releaseAlarm(); setTesting(false); timer.current = null; }, 3500);
    } catch (failure) { setTesting(false); setError(friendlyAuthError(failure, 'Could not play the alarm on this device.')); }
  }

  return <View style={s.page}><ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
    contentContainerStyle={[s.content, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 100, paddingLeft: Math.max(insets.left, 22), paddingRight: Math.max(insets.right, 22) }]}>
    <Animated.View entering={FadeInDown.duration(460).reduceMotion(ReduceMotion.System)}><ProfileCard name={name} email={email} level={answers.level} contact={contact} since={user?.metadata.creationTime || profile?.createdAt || answers.completedAt || undefined}/></Animated.View>
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text> : null}

    <AppearanceSetting/>

    <Animated.View layout={layout} style={s.section}>
      <HomePressable accessibilityRole="button" accessibilityState={{ expanded: section === 'details', disabled }} disabled={disabled} onPress={openDetails} style={s.sectionHeader}><View style={s.rowIcon}><TabIcon name="person" color={green} size={21}/></View><View style={s.rowCopy}><Text style={s.rowTitle}>Your details</Text><Text style={s.rowSubtitle}>Name & emergency contact</Text></View><Text style={s.chevron}>{section === 'details' ? '−' : '+'}</Text></HomePressable>
      {section === 'details' ? <Animated.View entering={enter} style={s.editor}>
        <Text style={s.label}>Full name</Text><TextInput accessibilityLabel="Full name" autoComplete="name" autoCapitalize="words" value={draft.name} onChangeText={value => setDraft(current => ({ ...current, name: value }))} maxLength={60} editable={!disabled} style={s.input} placeholder="Your full name" placeholderTextColor={palette.faint}/>
        <Text style={s.label}>Emergency contact name</Text><TextInput accessibilityLabel="Emergency contact name" autoCapitalize="words" value={draft.contactName} onChangeText={value => setDraft(current => ({ ...current, contactName: value }))} maxLength={60} editable={!disabled} style={s.input} placeholder="Someone you trust" placeholderTextColor={palette.faint}/>
        <Text style={s.label}>Emergency contact phone</Text><TextInput accessibilityLabel="Emergency contact phone" autoComplete="tel" keyboardType="phone-pad" value={draft.phone} onChangeText={value => setDraft(current => ({ ...current, phone: value }))} maxLength={25} editable={!disabled} style={s.input} placeholder="Include the country code, e.g. +977" placeholderTextColor={palette.faint}/>
        <Text style={s.help}>Leave both contact fields empty to remove your emergency contact.</Text>
        <View style={s.actions}><HomePressable accessibilityRole="button" disabled={disabled} onPress={() => { setSection(null); setError(''); }} style={s.secondary}><Text style={s.secondaryText}>Cancel</Text></HomePressable><HomePressable accessibilityRole="button" disabled={disabled} onPress={saveDetails} style={[s.primary, disabled && s.disabled]}>{busy === 'details' ? <ActivityIndicator color="white"/> : <Text style={s.primaryText}>Save details</Text>}</HomePressable></View>
      </Animated.View> : null}
    </Animated.View>

    <Animated.View layout={layout} style={s.section}>
      <HomePressable accessibilityRole="button" accessibilityState={{ expanded: section === 'preferences', disabled }} disabled={disabled} onPress={() => { setSection(value => value === 'preferences' ? null : 'preferences'); setNotice(''); setError(''); }} style={s.sectionHeader}><View style={s.rowIcon}><TabIcon name="compass" color={green} size={21}/></View><View style={s.rowCopy}><Text style={s.rowTitle}>Trail preferences</Text><Text style={s.rowSubtitle}>{levelLabel(answers.level)}{answers.goals.length ? ` · ${goalLabels(answers.goals).length} interests` : ''}</Text></View><Text style={s.chevron}>{section === 'preferences' ? '−' : '+'}</Text></HomePressable>
      {section === 'preferences' ? <Animated.View entering={enter} style={s.editor}><Text style={s.label}>Your experience</Text><View style={s.chips}>{LEVELS.map(level => <HomePressable key={level.id} accessibilityRole="button" accessibilityState={{ selected: answers.level === level.id }} disabled={disabled} onPress={() => void save({ level: level.id }, 'preferences')} style={[s.chip, answers.level === level.id && s.selectedChip]}><Text style={[s.chipText, answers.level === level.id && s.selectedText]}>{level.label}</Text></HomePressable>)}</View><Text style={s.label}>What draws you outside? Pick up to {MAX_GOALS}.</Text><View style={s.chips}>{GOALS.map(goal => { const selected = answers.goals.includes(goal.id); return <HomePressable key={goal.id} accessibilityRole="button" accessibilityState={{ selected }} disabled={disabled || !selected && answers.goals.length >= MAX_GOALS} onPress={() => void save({ goals: selected ? answers.goals.filter(id => id !== goal.id) : [...answers.goals, goal.id] }, 'preferences')} style={[s.chip, selected && s.selectedChip, !selected && answers.goals.length >= MAX_GOALS && s.disabled]}><Text style={[s.chipText, selected && s.selectedText]}>{goal.label}</Text></HomePressable>; })}</View><Text style={s.help}>{busy === 'preferences' ? 'Saving…' : 'Preferences save when you select them.'}</Text></Animated.View> : null}
    </Animated.View>

    <Animated.View layout={layout} style={s.section}><View style={s.sectionHeader}><View style={s.rowIcon}><TabIcon name="siren" color={green} size={21}/></View><View style={s.rowCopy}><Text style={s.rowTitle}>On-device alarm</Text><Text style={s.rowSubtitle}>A manual sound test on this device.</Text></View><Switch accessibilityLabel="Enable on-device alarm" value={answers.alertsEnabled} disabled={disabled || testing} onValueChange={value => void save({ alertsEnabled: value }, 'alarm')} trackColor={{ false: palette.border, true: palette.primary }} thumbColor={answers.alertsEnabled ? green : '#FFFFFF'} ios_backgroundColor={palette.border}/></View>
      {answers.alertsEnabled ? <View style={s.editor}><HomePressable accessibilityRole="button" disabled={disabled} onPress={() => void testAlarm()} style={s.secondary}><Text style={s.secondaryText}>{testing ? 'Stop test alarm' : 'Test alarm'}</Text></HomePressable><Text style={s.help}>Plays for 3.5 seconds. Your media volume and phone settings apply.</Text></View> : null}
    </Animated.View>

    <View style={s.account}><HomePressable accessibilityRole="button" onPress={() => router.push('/privacy')} style={s.accountRow}><View style={s.rowCopy}><Text style={s.rowTitle}>Privacy & stored data</Text><Text style={s.rowSubtitle}>Manage the information you keep in Navo.</Text></View><Text style={s.chevron}>↗</Text></HomePressable>
      <HomePressable accessibilityRole="button" disabled={disabled} onPress={() => { setError(''); void signOut().catch(failure => setError(friendlyAuthError(failure, 'Could not sign out. Please retry.'))); }} style={s.accountRow}><Text style={s.signOut}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>{signingOut ? <ActivityIndicator color={green}/> : <Text style={s.signOut}>↗</Text>}</HomePressable>
    </View>
    <Text style={s.footer}>A little further. A little freer.</Text>
  </ScrollView></View>;
}

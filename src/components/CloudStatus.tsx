import { View, Text, StyleSheet } from 'react-native';
import { useCloud } from '@/context/CloudContext';
import { Badge, Button, Notice } from './ui';
import { useFirebaseAuth } from '@/context/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { apiBase } from '@/lib/api';
import { colors } from '@/theme/tokens';
export function CloudStatus() {
  const cloud = useCloud();
  const { user } = useFirebaseAuth();
  const [feedback, setFeedback] = useState({ uid: '', message: '', success: false });
  const [busy, setBusy] = useState(''); const [cooldown, setCooldown] = useState(0); const lock = useRef(false);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timer); }, [cooldown]);
  async function verifyEmail(check = false) {
    if (!user || lock.current || (!check && cooldown > 0)) return;
    const uid = user.uid; lock.current = true; setBusy(check ? 'check' : 'send'); setFeedback({ uid, message: '', success: false });
    try {
      await user.reload();
      if (user.emailVerified) {
        await user.getIdToken(true);
        setFeedback({ uid, message: 'Email verified. Reconnecting your account…', success: true }); cloud.retry();
      } else if (check) setFeedback({ uid, message: 'This address is not verified yet. Open the latest verification link, then check again.', success: false });
      else {
        await sendEmailVerification(user); setCooldown(60);
        setFeedback({ uid, message: `Verification requested for ${user.email ?? 'your account email'}. Check Inbox and Spam. Delivery may take a few minutes; Navo cannot confirm delivery to your mailbox.`, success: true });
      }
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
      if (code === 'auth/too-many-requests') setCooldown(60);
      setFeedback({ uid, success: false, message: code === 'auth/too-many-requests' ? 'Too many requests. Wait a minute before trying again.' : code === 'auth/network-request-failed' ? 'Could not contact the email service. Check your connection and retry.' : 'Could not complete verification. Try again or sign in again to refresh your session.' });
    } finally { lock.current = false; setBusy(''); }
  }
  if (!apiBase) return <View style={styles.wrap}><Badge label="PERSONAL PLANNING AVAILABLE" tone="lime" /><Text style={styles.copy}>Save your trip on this phone now. Shared groups and AI planning are not connected in this build. Email verification will not enable those services until Navo is connected.</Text></View>;
  return <View style={styles.wrap}><Badge label={cloud.ready ? 'CONNECTED' : 'CONNECT YOUR ACCOUNT'} tone={cloud.ready ? 'lime' : 'warning'} />
    {!cloud.ready && <Text style={styles.copy}>Your saved plans still work. Connect to invite your crew and sync group updates.</Text>}
    <Notice message={feedback.uid === user?.uid ? feedback.message : ''} tone={feedback.success ? 'success' : 'warning'} />
    <Notice message={cloud.error} />
    {user && !user.emailVerified && <><Text style={styles.copy}>Verify {user.email} to use shared groups. You can keep planning on this device without verification.</Text><Button label={cooldown ? `Resend in ${cooldown}s` : 'Send verification email'} busy={busy === 'send'} disabled={Boolean(busy) || cooldown > 0} variant="outline" onPress={() => void verifyEmail()} /><Button label="I opened the link · check again" busy={busy === 'check'} disabled={Boolean(busy)} variant="quiet" onPress={() => void verifyEmail(true)} /></>}
    {(!cloud.ready || cloud.error) && <Button label="Retry connection" disabled={Boolean(busy)} variant="quiet" onPress={cloud.retry} />}
  </View>;
}
const styles = StyleSheet.create({ wrap: { gap: 8, marginVertical: 12 }, copy: { color: colors.muted, fontSize: 14, lineHeight: 22 } });

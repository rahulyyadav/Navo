import { View, Text, StyleSheet } from 'react-native';
import { useCloud } from '@/context/CloudContext';
import { Badge, Button, Notice } from './ui';
import { useFirebaseAuth } from '@/context/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { useState } from 'react';
import { colors } from '@/theme/tokens';
export function CloudStatus() {
  const cloud = useCloud();
  const { user } = useFirebaseAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  async function verifyEmail() {
    if (!user || sending) return; setSending(true);
    try { await sendEmailVerification(user); setMessage('Verification email sent. Open the link, then tap Retry connection.'); }
    catch { setMessage('Could not send verification email. Please wait and try again.'); }
    finally { setSending(false); }
  }
  return <View style={styles.wrap}><Badge label={cloud.status.toUpperCase()} tone={cloud.status === 'Connected' ? 'lime' : 'warning'} />{!cloud.ready && <Text style={styles.copy}>Your personal preparation stays on this device. Groups need the Navo server and Firebase connection.</Text>}<Notice message={message || cloud.error} />{user && !user.emailVerified && <Button label="Verify my email" busy={sending} variant="outline" onPress={() => void verifyEmail()} />}{(!cloud.ready || cloud.error) && <Button label="Retry connection" variant="quiet" onPress={cloud.retry} />}</View>;
}
const styles = StyleSheet.create({ wrap: { gap: 8, marginVertical: 12 }, copy: { color: colors.muted, fontSize: 13, lineHeight: 20 } });

import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/Typography';
import { useCloud } from '@/context/CloudContext';
import { Badge, Button, Notice } from './ui';
import { colors } from '@/theme/tokens';
export function CloudStatus() {
  const cloud = useCloud();
  return <View style={styles.wrap}><Badge label={cloud.status.toUpperCase()} tone={cloud.status === 'Connected' ? 'lime' : 'warning'} />{!cloud.ready && <Text style={styles.copy}>Your personal preparation stays on this device. Groups need the Navo server and Firebase connection.</Text>}<Notice message={cloud.error} />{(!cloud.ready || cloud.error) && <Button label="Retry connection" variant="quiet" onPress={cloud.retry} />}</View>;
}
const styles = StyleSheet.create({ wrap: { gap: 8, marginVertical: 12 }, copy: { color: colors.muted, fontSize: 13, lineHeight: 20 } });

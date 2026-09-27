import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>NAVO</Text>
        <Text style={styles.title}>Welcome back.</Text>
        <Text style={styles.body}>Your login experience is coming next.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#F5F4EE', flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  eyebrow: { color: '#6E7A40', fontSize: 13, fontWeight: '800', letterSpacing: 3, marginBottom: 16 },
  title: { color: '#172016', fontSize: 38, fontWeight: '700', letterSpacing: -1.2 },
  body: { color: '#697064', fontSize: 17, lineHeight: 25, marginTop: 12 },
});

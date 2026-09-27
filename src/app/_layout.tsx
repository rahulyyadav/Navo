import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="discover" options={{ headerShown: false }} />
        <Stack.Screen name="plan" options={{ title: 'Trek plan' }} />
        <Stack.Screen name="safety" options={{ title: 'Offline & safety' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

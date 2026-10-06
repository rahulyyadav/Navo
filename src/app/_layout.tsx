import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, satoshiFonts } from '@/components/Typography';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Backdrop, Button, Heading, useReducedMotion } from '@/components/ui';
import { IncomingUpdates } from '@/components/IncomingUpdates';
import { AuthProvider } from '@/context/AuthContext';
import { CloudProvider } from '@/context/CloudContext';
import { NavoProvider, useNavo } from '@/context/NavoContext';
import { firebaseConfigured } from '@/lib/firebase';
import { colors } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <Backdrop><View style={styles.boot}><Heading title="Let’s try that again." subtitle="Navo could not display this screen. Your saved data has not been cleared." /><Button label="Reload this screen" onPress={() => void retry()} /></View></Backdrop>;
}

export const unstable_settings = { initialRouteName: 'index', screenErrorBoundary: ErrorBoundary };

function BootScreen({ title, detail }: { title: string; detail?: string }) {
  return <Backdrop>
    <View style={styles.boot}>
      <ActivityIndicator color={colors.lime} size="large" />
      <Text style={styles.bootTitle}>{title}</Text>
      {detail ? <Text style={styles.bootDetail}>{detail}</Text> : null}
    </View>
  </Backdrop>;
}

function NotConfigured() {
  return <View style={styles.missing}>
    <Text style={styles.missingTitle}>Navo needs Firebase configuration</Text>
    <Text style={styles.missingDetail}>
      Add the EXPO_PUBLIC_FIREBASE_* values from .env.example to .env, then restart Expo.
      These client configuration values are safe to bundle; never add an Admin SDK private key.
    </Text>
  </View>;
}

function Routes() {
  const { authLoaded, isSignedIn, hydrated, needsOnboarding } = useNavo();
  const reduced = useReducedMotion();
  const animation = reduced ? 'none' : 'slide_from_right';
  useEffect(() => {
    if (!isSignedIn || !hydrated || needsOnboarding) return;
    let active = true;
    void AsyncStorage.getItem('navo:pending-invite').then(value => {
      if (!active || !value) return;
      const saved = JSON.parse(value);
      if (/^[a-zA-Z0-9]{1,80}$/.test(saved.group) && /^[a-zA-Z0-9_-]{43}$/.test(saved.token)) router.push({ pathname: '/join', params: saved });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [isSignedIn, hydrated, needsOnboarding]);


  if (!authLoaded || (isSignedIn && !hydrated)) {
    return <BootScreen title="Waking Navo up" detail={isSignedIn ? 'Restoring your treks and groups…' : 'Securing your session…'} />;
  }

  return <><Stack screenOptions={{
    headerShadowVisible: false,
    headerBackTitle: 'Back',
    headerStyle: { backgroundColor: colors.night },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontFamily: 'SatoshiBold', fontWeight: 'normal' },
    contentStyle: { backgroundColor: colors.night },
    animation,
  }}>
    <Stack.Protected guard={!isSignedIn}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
    </Stack.Protected>

    <Stack.Protected guard={isSignedIn && needsOnboarding}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack.Protected>

    <Stack.Protected guard={isSignedIn && !needsOnboarding}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: reduced ? 'none' : 'fade' }} />
      <Stack.Screen name="journey" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="trek/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="group/[id]" options={{ title: 'Group', headerBackTitle: 'Back' }} />
      <Stack.Screen name="group/new" options={{ title: 'New group', presentation: 'modal' }} />
      <Stack.Screen name="alert" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="notifications" options={{ title: 'Your updates' }} />
      <Stack.Screen name="copilot" options={{ title: 'AI trek copilot' }} />
      <Stack.Screen name="offline" options={{ title: 'Offline trip packs' }} />
      <Stack.Screen name="plan" options={{ headerShown: false }} />
      <Stack.Screen name="trips" options={{ title: 'Your trips' }} />
      <Stack.Screen name="trip/[id]" options={{ title: 'Trip details' }} />
      <Stack.Screen name="record-hike" options={{ title: 'Record a hike' }} />
      <Stack.Screen name="day-hike" options={{ title: "Plan a day hike" }} />
      <Stack.Screen name="safety" options={{ title: 'Offline essentials', headerBackTitle: 'Back' }} />
    </Stack.Protected>
    <Stack.Screen name="join" options={{ title: "Join a trek group" }} />
    <Stack.Screen name="privacy" options={{ title: "Privacy & data" }} />
  </Stack>{isSignedIn && !needsOnboarding && <IncomingUpdates />}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(satoshiFonts);
  if (!fontsLoaded && !fontError) return <BootScreen title="Waking Navo up" />;
  if (!firebaseConfigured) return <NotConfigured />;
  return <AuthProvider>
    <SafeAreaProvider>
      <CloudProvider><NavoProvider>
        <StatusBar style="light" />
        <Routes />
      </NavoProvider></CloudProvider>
    </SafeAreaProvider>
  </AuthProvider>;
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 },
  bootTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  bootDetail: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  missing: { flex: 1, backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  missingTitle: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  missingDetail: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
});

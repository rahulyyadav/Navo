import { router, useLocalSearchParams } from 'expo-router';
import { TrekJourney } from '@/components/trekking/TrekJourney';
import { trekById } from '@/data/treks';
import { useNavo } from '@/context/NavoContext';
import { Backdrop, Button, Heading } from '@/components/ui';
import { View } from 'react-native';
export default function JourneyScreen() {
  const params = useLocalSearchParams<{ trek?: string }>();
  const { userId } = useNavo();
  const trek = trekById(typeof params.trek === 'string' ? params.trek : '');
  const exit = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/discover');
  if (!trek) return <Backdrop><View style={{ padding: 24, flex: 1, justifyContent: 'center', gap: 20 }}><Heading title="Choose a trek first" subtitle="Open a trek or its preparation page to start your journey." /><Button label="Back to Discover" onPress={() => router.replace('/(tabs)/discover')} /></View></Backdrop>;
  return <TrekJourney trek={trek} userId={userId ?? undefined} onExit={exit} />;
}

import { router, useLocalSearchParams } from 'expo-router';
import { PreparationPage } from '@/components/preparation/PreparationPage';
import { Backdrop, Button, Heading } from '@/components/ui';
import { useNavo } from '@/context/NavoContext';
import { treks, type Trek } from '@/data/treks';
import { usePreparation } from '@/hooks/usePreparation';
import { View } from 'react-native';

export default function PlanScreen() {
  const { trek: trekId } = useLocalSearchParams<{ trek?: string }>();
  const trek = treks.find(value => value.id === trekId);
  if (!trek) return <Backdrop><View style={{ flex: 1, justifyContent: 'center', padding: 25, gap: 20 }}><Heading title="Choose your trek first." subtitle="Open a trek route, then tap Prepare for this trek." /><Button label="Explore trek routes" onPress={() => router.replace('/(tabs)/discover')} /><Button label="Go back" variant="quiet" onPress={() => router.back()} /></View></Backdrop>;
  return <SelectedPreparation key={trek.id} trek={trek} />;
}
function SelectedPreparation({ trek }: { trek: Trek }) {
  const { userId } = useNavo();
  const preparation = usePreparation(userId, trek.id);
  return <PreparationPage {...preparation} trek={trek} onChange={preparation.change} onRetry={() => void preparation.retry()} onBack={() => router.back()} onStart={() => router.push({ pathname: '/journey', params: { trek: trek.id } })} />;
}

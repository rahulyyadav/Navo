import { router } from 'expo-router';
import { View } from 'react-native';
import { Backdrop, Button, Heading } from '@/components/ui';
export default function NotFound() {
  return <Backdrop><View style={{ flex: 1, justifyContent: 'center', padding: 28, gap: 20 }}><Heading title="This path ends here." subtitle="That screen is unavailable. Return to Navo and choose your next step." /><Button label="Return to Navo" onPress={() => router.replace('/')} /></View></Backdrop>;
}

import { router } from 'expo-router';
import { HomeScreen } from '@/components/HomeScreen';
import { useCloud } from '@/context/CloudContext';
import { useNavo } from '@/context/NavoContext';
import { useFirebaseAuth } from '@/context/AuthContext';

export default function DiscoverScreen() {
  const { profile, answers } = useNavo();
  const { user } = useFirebaseAuth();
  const cloud = useCloud();
  const firstName = (profile?.fullName || answers.fullName || user?.displayName || '').trim().split(/\s+/)[0] || 'trekker';
  return <HomeScreen
    name={firstName}
    unread={cloud.notifications.filter(item => !item.read).length}
    onInbox={() => router.push('/notifications')}
    onGroups={() => router.push('/(tabs)/groups')}
    onPlan={() => router.push('/trek-plan')}
    onTrek={trek => router.push(`/trek/${trek.id}`)}
    onCopilot={() => router.push('/(tabs)/ai')}
    onOffline={() => router.push('/safety')}
  />;
}

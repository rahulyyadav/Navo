import { useLocalSearchParams } from 'expo-router';
import { TrekDetail } from '@/components/treks/TrekDetail';

export default function TrekScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TrekDetail key={id} id={Array.isArray(id) ? id[0] : id}/>;
}

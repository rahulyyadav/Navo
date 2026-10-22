import { useLocalSearchParams } from 'expo-router';
import { useJourneys } from '@/hooks/useJourneys';
import { journeyChatSummary } from '@/services/journeys/types';
import { AIChatPage } from '@/components/AIChatPage';
import { useNavo } from '@/context/NavoContext';
import { chatBase, requestChatAPI } from '@/lib/api';

export default function AIChatScreen() {
  const { journeyId } = useLocalSearchParams<{journeyId?:string}>();
  const library = useJourneys();
  const journey = library.data.journeys.find(j=>j.id===journeyId);
  const { isSignedIn, profile, email, answers } = useNavo();
  if (!isSignedIn) return null;
  const firstName = (answers.fullName.trim() || profile?.fullName?.trim() || '').split(/\s+/)[0] || '';
  return <AIChatPage ready={Boolean(chatBase)} name={firstName} request={messages => {
    if (!isSignedIn) return Promise.reject(new Error('Sign in to use Navo AI.'));
    return requestChatAPI(messages, profile?.email || email || null, undefined, journey ? journeyChatSummary(journey) : undefined);
  }} />;
}

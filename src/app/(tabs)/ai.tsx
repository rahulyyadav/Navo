import { AIChatPage } from '@/components/AIChatPage';
import { useNavo } from '@/context/NavoContext';
import { requestChatAPI } from '@/lib/api';
import { useAiStatus } from '@/hooks/useAiStatus';

export default function AIChatScreen() {
  const { isSignedIn, profile, email } = useNavo();
  const { status, retry } = useAiStatus();
  if (!isSignedIn) return null;
  return <AIChatPage status={status} retry={retry} request={messages => {
    if (!isSignedIn) return Promise.reject(new Error('Sign in to use Navo AI.'));
    return requestChatAPI(messages, profile?.email || email || null);
  }} />;
}

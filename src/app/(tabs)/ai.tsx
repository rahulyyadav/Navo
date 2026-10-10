import { AIChatPage } from '@/components/AIChatPage';
import { useNavo } from '@/context/NavoContext';
import { chatBase, requestChatAPI } from '@/lib/api';

export default function AIChatScreen() {
  const { isSignedIn, profile, email } = useNavo();
  if (!isSignedIn) return null;
  return <AIChatPage ready={Boolean(chatBase)} request={messages => {
    if (!isSignedIn) return Promise.reject(new Error('Sign in to use Navo AI.'));
    return requestChatAPI(messages, profile?.email || email || null);
  }} />;
}

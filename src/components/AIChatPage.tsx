import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/Typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { actionError } from '@/lib/api';
import { Reveal } from '@/components/ui';

type Message = { role: 'user' | 'assistant'; content: string };
const suggestions = ['Help me choose a trek', 'What should I pack?', 'Plan a gentle first trek'];
type Props = { ready: boolean; retry?: () => void; request: (messages: Message[]) => Promise<{ reply: string }> };
export function AIChatPage({ ready, retry, request }: Props) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const lock = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  async function send(text = draft) {
    const content = text.trim();
    if (!content || lock.current) return;
    if (!ready) { setError('AI chat needs a connection. Please reconnect and try again.'); return; }
    lock.current = true; setPending(content); setDraft(content); setError('');
    try {
      const history: Message[] = [...messages.slice(-18), { role: 'user', content }];
      const result = await request(history);
      setMessages(current => [...current, { role: 'user', content }, { role: 'assistant', content: result.reply }]);
      setDraft('');
    } catch (failure) { setError(actionError(failure)); }
    finally { lock.current = false; setPending(''); }
  }
  return <View style={styles.page}>
    <LinearGradient colors={['#819EB8', '#536D86', '#3C5872']} style={StyleSheet.absoluteFill} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}><View><Text style={styles.title}>Navo AI</Text><Text style={styles.subtitle}>Your mountain companion</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Start a new chat" disabled={Boolean(pending)} onPress={() => { setMessages([]); setDraft(''); setError(''); }} style={styles.newChat}><Text style={styles.newChatText}>＋</Text></Pressable></View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.conversation} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {!messages.length && !pending && <Reveal><View style={styles.welcome}><Text style={styles.welcomeTitle}>Where will we go?</Text><Text style={styles.welcomeCopy}>Find your trail, prepare your pack, or talk through a trek. Let’s take it one step at a time.</Text>{suggestions.map(text => <Pressable key={text} accessibilityRole="button" onPress={() => void send(text)} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}><Text style={styles.suggestionText}>{text}</Text><Text style={styles.suggestionText}>↗</Text></Pressable>)}</View></Reveal>}
        {messages.map((message, index) => <View key={index} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}><Text style={styles.sender}>{message.role === 'user' ? 'YOU' : 'NAVO AI'}</Text><Text selectable style={styles.message}>{message.content}</Text></View>)}
        {pending && <><View style={[styles.bubble, styles.userBubble]}><Text style={styles.message}>{pending}</Text></View><View accessibilityLiveRegion="polite" style={styles.thinking}><ActivityIndicator color="white" size="small" /><Text style={styles.subtitle}>Thinking about your trail…</Text></View></>}
      </ScrollView>
      <View style={[styles.composerArea, { paddingBottom: Math.max(insets.bottom, 12) + (keyboardOpen ? 0 : 80) }]}>
        {!ready && (retry ? <Pressable accessibilityRole="button" onPress={retry}><Text style={styles.status}>Chat is offline · Tap to reconnect</Text></Pressable> : <Text style={styles.status}>Chat connection is not configured yet.</Text>)}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <View style={styles.composer}><TextInput accessibilityLabel="Message Navo AI" placeholder="Ask about your next adventure…" placeholderTextColor="rgba(255,255,255,0.55)" multiline maxLength={2000} value={draft} editable={!pending} onChangeText={setDraft} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || Boolean(pending)} onPress={() => void send()} style={[styles.send, (!draft.trim() || Boolean(pending)) && styles.disabled]}><Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#18251A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 19V5m-6 6 6-6 6 6" /></Svg></Pressable></View>
        <Text style={styles.caption}>AI can make mistakes. Verify trail conditions with a qualified guide.</Text>
      </View>
    </KeyboardAvoidingView>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#536D86' }, header: { paddingHorizontal: 24, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { color: 'white', fontSize: 28, fontWeight: '600', letterSpacing: -0.7 }, subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 4 }, newChat: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }, newChatText: { color: 'white', fontSize: 26 }, conversation: { padding: 20, gap: 14, flexGrow: 1 }, welcome: { paddingTop: 32, gap: 14 }, welcomeTitle: { color: 'white', fontSize: 33, fontWeight: '600', letterSpacing: -1 }, welcomeCopy: { color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 25, marginBottom: 14 }, suggestion: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.13)' }, suggestionText: { color: 'white', fontSize: 14 }, bubble: { maxWidth: '92%', borderRadius: 24, padding: 17, gap: 7 }, userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(206,229,246,0.22)', borderBottomRightRadius: 7 }, aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(28,56,79,0.42)', borderBottomLeftRadius: 7 }, sender: { color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 1.2, fontWeight: '600' }, message: { color: 'white', fontSize: 15, lineHeight: 23 }, thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }, composerArea: { paddingHorizontal: 20, paddingTop: 12 }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 28, padding: 8 }, input: { flex: 1, color: 'white', minHeight: 42, maxHeight: 120, paddingHorizontal: 10, paddingTop: 11, paddingBottom: 10, fontSize: 14 }, send: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E4FF89', alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.4 }, caption: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', marginTop: 9 }, error: { color: '#FFE1DB', fontSize: 13, lineHeight: 19, marginBottom: 10 }, status: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 10 }, pressed: { opacity: 0.75 },
});

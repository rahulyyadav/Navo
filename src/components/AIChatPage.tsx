import { AIReply } from './AIReply';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/Typography';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { actionError } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { createThemedStyles } from '@/theme/create-styles';
import { HomePressable } from './journeys/HomeMotion';

type Message = { role: 'user' | 'assistant'; content: string };
type Props = { ready: boolean; name?: string; retry?: () => void; request: (messages: Message[]) => Promise<{ reply: string }> };

const bubbleEnter = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);
const composerEnter = FadeInDown.duration(380).delay(120).reduceMotion(ReduceMotion.System);
function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
export function AIChatPage({ ready, name, retry, request }: Props) {
  const styles = useStyles();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const lock = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const showGreeting = messages.length === 0 && !pending;
  const ring = useSharedValue(0);
  useEffect(() => { ring.value = withTiming(focused ? 1 : 0, { duration: 180, reduceMotion: ReduceMotion.System }); }, [focused, ring]);
  const composerMotion = useAnimatedStyle(() => ({ borderColor: interpolateColor(ring.value, [0, 1], [palette.border, palette.green]) }));
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
    {router.canGoBack() ? <Animated.View entering={FadeInDown.duration(380).reduceMotion(ReduceMotion.System)} style={[styles.backBtn, { top: insets.top + 10 }]}>
      <HomePressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backInner}>
        <Text style={styles.backText}>← Back</Text>
      </HomePressable>
    </Animated.View> : null}
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.conversation, { paddingTop: insets.top + 14 }]} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {showGreeting ? <Animated.View entering={FadeInDown.duration(380).reduceMotion(ReduceMotion.System)} style={styles.greetingWrap}>
          <Text style={styles.greeting} accessibilityRole="header">{name ? `${greeting()}, ${name}` : greeting()}</Text>
        </Animated.View> : null}
        {messages.map((message, index) => <Animated.View key={index} entering={bubbleEnter} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}><Text style={[styles.sender, message.role === 'user' && { color: palette.green }]}>{message.role === 'user' ? 'YOU' : 'NAVO AI'}</Text>{message.role === 'assistant' ? <AIReply content={message.content} style={styles.message} /> : <Text selectable style={styles.message}>{message.content}</Text>}</Animated.View>)}
        {Boolean(pending) && <><Animated.View entering={bubbleEnter} style={[styles.bubble, styles.userBubble]}><Text style={styles.message}>{pending}</Text></Animated.View><View accessibilityLiveRegion="polite" style={styles.thinking}><ActivityIndicator color={palette.green} size="small" /><Text style={styles.subtitle}>Connecting & thinking… First connection may take a minute.</Text></View></>}
      </ScrollView>
      <Animated.View entering={composerEnter} style={[styles.composerArea, { paddingBottom: Math.max(insets.bottom - 8, 10) + 58 + 14 }]}>
        {!ready && (retry ? <Pressable accessibilityRole="button" onPress={retry}><Text style={styles.status}>Chat is offline · Tap to reconnect</Text></Pressable> : <Text style={styles.status}>Chat connection is not configured yet.</Text>)}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <Animated.View style={[styles.composer, composerMotion]}>
          <TextInput accessibilityLabel="Message Navo AI" placeholder="Ask Navo anything…" multiline maxLength={2000} value={draft} editable={!pending} onChangeText={setDraft} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={styles.input}/>
          <HomePressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || Boolean(pending)} onPress={() => void send()} style={[styles.send, (!draft.trim() || Boolean(pending)) && styles.disabled]}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={palette.onPrimary} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 19V5m-6 6 6-6 6 6"/></Svg>
          </HomePressable>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  </View>;
}
const useStyles = createThemedStyles(t => StyleSheet.create({
  page: { flex: 1, backgroundColor: t.background },
  conversation: { flexGrow: 1, padding: 18, gap: 12 },
  greetingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 70 },
  greeting: { color: t.muted, fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.5, textAlign: 'center' },
  backBtn: { position: 'absolute', left: 16, zIndex: 3 },
  backInner: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#153B2A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  backText: { color: t.ink, fontSize: 14, fontWeight: '600' },
  bubble: { maxWidth: '92%', borderRadius: 22, padding: 15, gap: 6 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: t.mint, borderBottomRightRadius: 8 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderBottomLeftRadius: 8 },
  sender: { color: t.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  message: { color: t.ink, fontSize: 15, lineHeight: 23 },
  subtitle: { color: t.muted, fontSize: 13 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  composerArea: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: t.elevated, borderRadius: 28, borderWidth: 1, borderColor: t.border, padding: 7, paddingLeft: 18, shadowColor: '#153B2A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 3 },
  input: { flex: 1, color: t.ink, minHeight: 46, maxHeight: 120, paddingTop: 13, paddingBottom: 12, fontSize: 16 },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  status: { color: t.muted, fontSize: 12 },
  error: { color: t.danger, fontSize: 13, lineHeight: 19 },
}));

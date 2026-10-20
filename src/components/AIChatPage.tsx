import { AIReply } from './AIReply';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/Typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { actionError } from '@/lib/api';
import { colors, radius, space } from '@/theme/tokens';
import { Badge, Button, Card, Notice, Reveal, enter, useReducedMotion } from '@/components/ui';
import { aiStatusCopy, type AiStatus } from '@/services/ai-status';

type Message = { role: 'user' | 'assistant'; content: string };
const suggestions = [
  { text: 'Help me choose a trek', hint: 'Compare days, distance and difficulty' },
  { text: 'What should I pack?', hint: 'A kit list for the season you walk' },
  { text: 'Plan a gentle first trek', hint: 'Lower altitude, shorter walking days' },
];
const badgeTone: Record<AiStatus, 'neutral' | 'lime' | 'warning' | 'danger'> = {
  checking: 'neutral', online: 'lime', 'model-missing': 'warning', unreachable: 'danger', unconfigured: 'danger',
};
const noticeTone: Record<AiStatus, 'info' | 'success' | 'warning' | 'danger'> = {
  checking: 'info', online: 'success', 'model-missing': 'warning', unreachable: 'danger', unconfigured: 'danger',
};
const development = typeof __DEV__ !== 'undefined' && __DEV__;
const maxLength = 2000;

type Props = { status: AiStatus; retry: () => void; request: (messages: Message[]) => Promise<{ reply: string }> };

export function AIChatPage({ status, retry, request }: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const scroll = useRef<ScrollView>(null);
  const lock = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const copy = aiStatusCopy(status);
  const blocked = status === 'unconfigured';
  const banner = status !== 'online' && status !== 'checking';
  const busy = Boolean(pending);
  const canSend = Boolean(draft.trim()) && !busy;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  async function send(text = draft) {
    const content = text.trim();
    if (!content || lock.current) return;
    if (blocked) { setError(`${copy.title} ${copy.detail}`); return; }
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
    <LinearGradient colors={[colors.homeTop, colors.homeMiddle, colors.homeBottom]} style={StyleSheet.absoluteFill} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Navo AI</Text>
          <Text style={styles.subtitle}>Your mountain companion</Text>
        </View>
        <View style={styles.headerControls}>
          <Badge label={copy.label.toUpperCase()} tone={badgeTone[status]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            disabled={busy || !messages.length}
            onPress={() => { setMessages([]); setDraft(''); setError(''); }}
            style={({ pressed }) => [styles.newChat, (busy || !messages.length) && styles.inactive, pressed && styles.pressed]}
          >
            <Text style={styles.newChatText}>＋</Text>
          </Pressable>
        </View>
      </View>

      {banner && <View style={styles.bannerWrap}>
        <Card>
          <View style={styles.bannerHead}>
            <View style={styles.bannerSymbol}><Text style={styles.bannerSymbolText}>!</Text></View>
            <View style={styles.bannerHeadCopy}>
              <Text style={styles.bannerTitle}>{copy.title}</Text>
              <Text style={styles.bannerDetail}>{copy.detail}</Text>
              {development && copy.hint ? <Text style={styles.bannerHint}>{copy.hint}</Text> : null}
            </View>
          </View>
          <Button label="Check the connection again" variant="outline" onPress={retry} style={styles.bannerButton} />
        </Card>
      </View>}

      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.conversation} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: !reduced })}>
        {!messages.length && !pending && <Reveal><View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Where will we go?</Text>
          <Text style={styles.welcomeCopy}>Find your trail, prepare your pack, or talk through a trek. Let’s take it one step at a time.</Text>
          <View style={styles.suggestions}>
            {suggestions.map((item, index) => <Reveal key={item.text} delay={80 + index * 60} distance={12}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.text}. ${item.hint}`}
                disabled={blocked}
                onPress={() => void send(item.text)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed, blocked && styles.inactive]}
              >
                <View style={styles.suggestionCopy}>
                  <Text style={styles.suggestionText}>{item.text}</Text>
                  <Text style={styles.suggestionHint}>{item.hint}</Text>
                </View>
                <Text style={styles.suggestionArrow}>↗</Text>
              </Pressable>
            </Reveal>)}
          </View>
        </View></Reveal>}

        {messages.map((message, index) => {
          const mine = message.role === 'user';
          return <Animated.View
            key={index}
            entering={enter(FadeIn.duration(240), reduced)}
            style={[styles.bubble, mine ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={[styles.sender, mine ? styles.userSender : styles.aiSender]}>{mine ? 'YOU' : 'NAVO AI'}</Text>
            {mine
              ? <Text selectable style={[styles.message, styles.userMessage]}>{message.content}</Text>
              : <AIReply content={message.content} style={styles.message} />}
          </Animated.View>;
        })}

        {pending && <>
          <View style={[styles.bubble, styles.userBubble]}>
            <Text style={[styles.sender, styles.userSender]}>YOU</Text>
            <Text style={[styles.message, styles.userMessage]}>{pending}</Text>
          </View>
          <View accessibilityLiveRegion="polite" style={styles.thinking}>
            <View style={styles.thinkingMark}><Text style={styles.thinkingMarkText}>N</Text></View>
            <View style={styles.thinkingCopy}>
              <View style={styles.dots}><ThinkingDot delay={0} reduced={reduced} /><ThinkingDot delay={160} reduced={reduced} /><ThinkingDot delay={320} reduced={reduced} /></View>
              <Text style={styles.thinkingText}>Navo is thinking… the first reply can take a minute.</Text>
            </View>
          </View>
        </>}
      </ScrollView>

      <View style={[styles.composerArea, { paddingBottom: Math.max(insets.bottom, 12) + (keyboardOpen ? 0 : 80) }]}>
        {error ? <View style={styles.errorBlock}>
          <Notice message={error} tone={noticeTone[status]} />
          <Pressable accessibilityRole="button" onPress={retry} style={styles.errorRetry}><Text style={styles.errorRetryText}>Recheck connection</Text></Pressable>
        </View> : null}
        <View style={[styles.composer, focused && styles.composerFocused]}>
          <TextInput
            accessibilityLabel="Message Navo AI"
            placeholder="Ask about your next adventure…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            multiline
            maxLength={maxLength}
            value={draft}
            editable={!busy}
            onChangeText={value => { setDraft(value); if (error) setError(''); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
          />
          {draft.length > maxLength - 200 ? <Text style={styles.counter}>{maxLength - draft.length}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!canSend}
            onPress={() => void send()}
            style={[styles.send, !canSend && styles.sendDisabled]}
          >
            {busy
              ? <ActivityIndicator color={colors.onAccent} size="small" />
              : <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.onAccent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 19V5m-6 6 6-6 6 6" /></Svg>}
          </Pressable>
        </View>
        <Text style={styles.caption}>AI can make mistakes. Verify trail conditions with a qualified guide.</Text>
      </View>
    </KeyboardAvoidingView>
  </View>;
}

function ThinkingDot({ delay, reduced }: { delay: number; reduced: boolean }) {
  const value = useSharedValue(reduced ? 0.85 : 0.3);
  useEffect(() => {
    if (reduced) return;
    value.value = withRepeat(withSequence(withDelay(delay, withTiming(1, { duration: 300 })), withTiming(0.3, { duration: 300 })), -1);
  }, [delay, reduced, value]);
  const animated = useAnimatedStyle(() => ({ opacity: value.value, transform: [{ translateY: (1 - value.value) * 3 }] }));
  return <Animated.View style={[styles.dot, animated]} />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.homeMiddle },
  header: { paddingHorizontal: space.lg, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '600', letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  newChat: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  newChatText: { color: colors.ink, fontSize: 24 },
  inactive: { opacity: 0.45 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },

  bannerWrap: { paddingHorizontal: 20, paddingBottom: 4 },
  bannerHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bannerSymbol: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,184,107,0.2)', borderWidth: 1, borderColor: 'rgba(255,184,107,0.45)', alignItems: 'center', justifyContent: 'center' },
  bannerSymbolText: { color: colors.warning, fontSize: 16, fontWeight: '800' },
  bannerHeadCopy: { flex: 1 },
  bannerTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  bannerDetail: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  bannerHint: { color: colors.lime, fontSize: 12, lineHeight: 18, marginTop: 8 },
  bannerButton: { marginTop: 14, minHeight: 46 },

  conversation: { padding: 20, gap: 12, flexGrow: 1 },
  welcome: { paddingTop: 24, gap: 12 },
  welcomeTitle: { color: colors.ink, fontSize: 32, fontWeight: '600', letterSpacing: -1 },
  welcomeCopy: { color: colors.muted, fontSize: 16, lineHeight: 25, marginBottom: 8 },
  suggestions: { gap: 10 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: colors.line },
  suggestionCopy: { flex: 1 },
  suggestionText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  suggestionHint: { color: colors.faint, fontSize: 12, lineHeight: 17, marginTop: 4 },
  suggestionArrow: { color: colors.lime, fontSize: 20 },

  bubble: { maxWidth: '86%', borderRadius: 22, padding: 15, gap: 6 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.lime, borderBottomRightRadius: 8 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, borderBottomLeftRadius: 8 },
  sender: { fontSize: 10, letterSpacing: 1.2, fontWeight: '800' },
  userSender: { color: 'rgba(25,41,58,0.6)' },
  aiSender: { color: colors.lime },
  message: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  userMessage: { color: colors.onAccent },

  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, alignSelf: 'flex-start' },
  thinkingMark: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  thinkingMarkText: { color: colors.onAccent, fontSize: 14, fontWeight: '800' },
  thinkingCopy: { gap: 5 },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center', minHeight: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime },
  thinkingText: { color: colors.muted, fontSize: 12, lineHeight: 17 },

  composerArea: { paddingHorizontal: 20, paddingTop: 10 },
  errorBlock: { marginBottom: 4 },
  errorRetry: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  errorRetryText: { color: colors.lime, fontSize: 13, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'transparent', borderRadius: radius.lg, padding: 8 },
  composerFocused: { borderColor: colors.lime, backgroundColor: 'rgba(255,255,255,0.16)' },
  input: { flex: 1, color: colors.ink, minHeight: 44, maxHeight: 120, paddingHorizontal: 10, paddingTop: 11, paddingBottom: 10, fontSize: 15 },
  counter: { color: colors.faint, fontSize: 11, paddingBottom: 14 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
  caption: { color: colors.faint, fontSize: 10, textAlign: 'center', marginTop: 9 },
});

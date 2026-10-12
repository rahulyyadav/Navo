import { View, type StyleProp, type TextStyle } from 'react-native';
import { Text } from './Typography';

/** A small native text renderer. Model output never becomes executable HTML. */
export function AIReply({ content, style }: { content: string; style?: StyleProp<TextStyle> }) {
  return <View style={{ gap: 8 }}>{content.split(/\n\s*\n/).map((paragraph, index) => {
    const text = paragraph.replace(/^#{1,4}\s+/gm, '').replace(/^[-*]\s+/gm, '• ');
    return <Text selectable key={index} style={style}>{text.split(/(\*\*[^*]+\*\*)/g).map((part, key) => part.startsWith('**') && part.endsWith('**') ? <Text key={key} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text> : part)}</Text>;
  })}</View>;
}

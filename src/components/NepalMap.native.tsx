import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Typography';
import { WebView } from 'react-native-webview';
import { mapDocument, mapPayload, scriptJSON, type NepalMapProps } from './maps/document';
import { trekById } from '@/data/treks';

export function NepalMap(props: NepalMapProps) {
  const webview = useRef<WebView>(null);
  const [html] = useState(() => mapDocument(props));
  const [failed, setFailed] = useState(false);
  const payload = scriptJSON(mapPayload(props));
  useEffect(() => {
    webview.current?.injectJavaScript(`window.updateNavoMap && window.updateNavoMap(${payload});true;`);
  }, [payload]);
  return <View style={styles.root}>
    <WebView ref={webview} source={{ html }} onLoadEnd={() => webview.current?.injectJavaScript(`window.updateNavoMap && window.updateNavoMap(${payload});true;`)} originWhitelist={['*']} applicationNameForUserAgent="Navo/1.0 (Nepal trek map)" javaScriptEnabled domStorageEnabled scrollEnabled={false} onError={() => setFailed(true)} onMessage={event => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'select-trek' && typeof message.id === 'string' && trekById(message.id)) props.onSelectTrek(message.id);
      } catch { /* Ignore malformed map events. */ }
    }} onShouldStartLoadWithRequest={request => {
      if (request.url === 'about:blank' || request.url.startsWith('about:srcdoc')) return true;
      if (/^https:\/\/(www\.)?(openstreetmap\.org|opentopomap\.org)\//.test(request.url)) void Linking.openURL(request.url).catch(() => undefined);
      return false;
    }} style={styles.root} />
    {failed && <Text style={styles.error}>Map unavailable. Check your connection and reopen this screen.</Text>}
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#19293a' }, error: { padding: 16, color: 'white' } });

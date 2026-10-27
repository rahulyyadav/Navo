import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Typography';
import { WebView } from 'react-native-webview';
import { mapDocument, type NepalMapProps } from './maps/document';
import { useMapPayload } from '@/hooks/useMapPayload';
import { trekById } from '@/data/treks';

export function NepalMap(props: NepalMapProps) {
  // Explicit extra-props type avoids WebView 14 defaulting to an undefined intersection.
  const webview = useRef<WebView<object>>(null);
  const [html] = useState(() => mapDocument(props));
  const [reload, setReload] = useState(0);
  const [failed, setFailed] = useState(false);
  const { fixed: payload, moving } = useMapPayload(props);
  useEffect(() => {
    webview.current?.injectJavaScript(`window.updateNavoMap && window.updateNavoMap(${payload});true;`);
  }, [payload]);
  useEffect(() => { webview.current?.injectJavaScript(`window.updateNavoPosition && window.updateNavoPosition(${moving});true;`); }, [moving]);
  return <View style={styles.root}>
    <WebView<object> key={reload} ref={webview} source={{ html }} onLoadEnd={() => webview.current?.injectJavaScript(`window.updateNavoMap && window.updateNavoMap(${payload});window.updateNavoPosition && window.updateNavoPosition(${moving});true;`)} originWhitelist={['*']} applicationNameForUserAgent="Navo/1.0 (Nepal trek map)" javaScriptEnabled domStorageEnabled scrollEnabled={false} onError={() => setFailed(true)} onContentProcessDidTerminate={() => setFailed(true)} onMessage={event => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'map-status' && typeof message.failed === 'boolean') setFailed(message.failed);
        if (message.type === 'select-coordinate' && Number.isFinite(message.latitude) && Math.abs(message.latitude) <= 90 && Number.isFinite(message.longitude) && Math.abs(message.longitude) <= 180) props.onSelectCoordinate?.({ latitude: message.latitude, longitude: message.longitude });
        if (message.type === 'select-trek' && typeof message.id === 'string' && trekById(message.id)) props.onSelectTrek(message.id);
      } catch { /* Ignore malformed map events. */ }
    }} onShouldStartLoadWithRequest={request => {
      if (request.url === 'about:blank' || request.url.startsWith('about:srcdoc')) return true;
      if (/^https:\/\/(www\.)?(openstreetmap\.org|opentopomap\.org)\//.test(request.url)) void Linking.openURL(request.url).catch(() => undefined);
      return false;
    }} style={styles.root} />
    {failed && <View style={styles.recovery}><Text style={styles.error}>Map unavailable. Check your connection.</Text><Pressable accessibilityRole="button" accessibilityLabel="Reload map" onPress={() => { setFailed(false); setReload(value => value + 1); }} style={styles.retry}><Text style={{ color: '#19293A', fontWeight: '700' }}>Reload map</Text></Pressable></View>}
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#19293a' }, recovery: { position: 'absolute', bottom: 12, left: 12, right: 12, padding: 12, borderRadius: 16, backgroundColor: '#19293A' }, retry: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4FF89', borderRadius: 22 }, error: { padding: 16, color: 'white' } });

import { useEffect, useRef, useState } from 'react';
import { mapDocument, mapPayload, type NepalMapProps } from './maps/document';
import { trekById } from '@/data/treks';
export type { NepalMapProps } from './maps/document';

export function NepalMap(props: NepalMapProps) {
  const { onSelectTrek } = props;
  const frame = useRef<HTMLIFrameElement>(null);
  const [html] = useState(() => mapDocument(props));
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || typeof event.data !== 'string') return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'select-trek' && typeof message.id === 'string' && trekById(message.id)) onSelectTrek(message.id);
      } catch { /* Ignore messages outside the map protocol. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onSelectTrek]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ type: 'navo-update', payload: mapPayload(props) }), '*');
  }, [props]);
  return <iframe onLoad={() => frame.current?.contentWindow?.postMessage(JSON.stringify({ type: 'navo-update', payload: mapPayload(props) }), '*')} ref={frame} title="Nepal trails and terrain map" srcDoc={html} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" style={{ border: 0, width: '100%', height: '100%', flex: 1 }} />;
}

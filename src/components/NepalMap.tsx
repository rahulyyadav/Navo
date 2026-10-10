import { useEffect, useRef, useState } from 'react';
import { mapDocument, type NepalMapProps } from './maps/document';
import { useMapPayload } from '@/hooks/useMapPayload';
import { trekById } from '@/data/treks';
export type { NepalMapProps } from './maps/document';

export function NepalMap(props: NepalMapProps) {
  const { onSelectTrek, onSelectCoordinate } = props;
  const frame = useRef<HTMLIFrameElement>(null);
  const [html] = useState(() => mapDocument(props));
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || typeof event.data !== 'string') return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'select-coordinate' && Number.isFinite(message.latitude) && Math.abs(message.latitude) <= 90 && Number.isFinite(message.longitude) && Math.abs(message.longitude) <= 180) onSelectCoordinate?.({ latitude: message.latitude, longitude: message.longitude });
        if (message.type === 'select-trek' && typeof message.id === 'string' && trekById(message.id)) onSelectTrek(message.id);
      } catch { /* Ignore messages outside the map protocol. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onSelectTrek, onSelectCoordinate]);
  const { fixed, moving } = useMapPayload(props);
  const payload = `{"type":"navo-update","payload":${fixed}}`;
  const positionPayload = `{"type":"navo-position","payload":${moving}}`;
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(payload, '*');
  }, [payload]);
  useEffect(() => { frame.current?.contentWindow?.postMessage(positionPayload, '*'); }, [positionPayload]);
  return <iframe ref={frame} title="Nepal trails and terrain map" srcDoc={html} onLoad={() => { frame.current?.contentWindow?.postMessage(payload, '*'); frame.current?.contentWindow?.postMessage(positionPayload, '*'); }} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" style={{ border: 0, width: '100%', height: '100%', flex: 1 }} />;
}

import { useEffect, useMemo, useState } from 'react';
import { AppState, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Text } from '@/components/Typography';
import { Button, Card, Notice } from '@/components/ui';
import { useTrekLocation } from '@/hooks/useTrekLocation';
import { distanceToRoute } from '@/services/route-distance';
import type { ImportedRoute } from '@/services/routes/gpx';
import { colors } from '@/theme/tokens';

/** An offline geometry overview, deliberately distinct from verified trail navigation. */
export function ImportedRoutePreview({ route }: { route: ImportedRoute }) {
  const [active, setActive] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const location = useTrekLocation(active);
  useEffect(() => { const subscription = AppState.addEventListener('change', state => { if (state !== 'active') setActive(false); }); return () => subscription.remove(); }, []);
  const geometry = useMemo(() => {
    const points = route.segments.flat();
    const latitudes = points.map(p => p.latitude), longitudes = points.map(p => p.longitude);
    const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes), minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
    const cos = Math.max(.01, Math.cos((maxLat + minLat) / 2 * Math.PI / 180));
    const scale = 280 / Math.max((maxLon - minLon) * cos, maxLat - minLat, .0001);
    const project = (p: { latitude: number; longitude: number }) => ({ x: 160 + (p.longitude - (minLon + maxLon) / 2) * cos * scale, y: 160 - (p.latitude - (minLat + maxLat) / 2) * scale });
    return { project, lines: route.segments.map(segment => segment.map(p => { const q = project(p); return `${q.x},${q.y}`; }).join(' ')) };
  }, [route]);
  const fix = active && !location.stale && location.state === 'tracking' && (location.fix?.timestamp ?? 0) >= startedAt ? location.fix : null;
  const marker = fix ? geometry.project(fix) : null;
  const visible = marker && marker.x >= 0 && marker.x <= 320 && marker.y >= 0 && marker.y <= 320;
  const separation = fix ? Math.min(...route.segments.map(segment => distanceToRoute(fix, segment) ?? Infinity)) : null;
  return <Card>
    <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 20, fontWeight: '700' }}>Offline route overview</Text>
    <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24, marginVertical: 10 }}>North is up. This shows the imported line without terrain or road context. GPS stays on this device.</Text>
    <View accessibilityLabel="Offline GPX geometry overview. Separate segments are not connected."><Svg viewBox="0 0 320 320" width="100%" height={280}>
      {geometry.lines.map((line, i) => <Polyline key={i} points={line} fill="none" stroke={colors.lime} strokeWidth={3} />)}
      {visible && <Circle cx={marker.x} cy={marker.y} r={6} fill="#168de2" stroke="white" strokeWidth={2} />}
    </Svg></View>
    {active && <Notice tone="info" message={fix ? `GPS accuracy ±${Math.round(fix.accuracy ?? 0)} m. About ${Math.round(separation ?? 0)} m from the imported line.${visible ? '' : ' Your position is outside this overview.'}` : location.state === 'denied' ? 'Location access is denied. Enable it in device settings, then retry.' : 'Waiting for a fresh, usable GPS position. No progress is being inferred.'} />}
    <Button label={active ? 'Stop GPS overlay' : 'Show my GPS on this route'} variant="outline" onPress={() => { setStartedAt(Date.now()); setActive(value => !value); }} />
    {active && ['denied','unavailable'].includes(location.state) && <Button label="Retry location" variant="quiet" onPress={location.retry} />}
    <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10 }}>Foreground only. Backgrounding pauses this overlay. No turn instructions, automatic rerouting or safety clearance are inferred from an imported file.</Text>
  </Card>;
}

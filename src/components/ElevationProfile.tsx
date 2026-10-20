import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { Text } from '@/components/Typography';
import { buildElevationProfile, xAtDistance, type ProfileStop } from '@/services/elevation-profile';
import { useMeasuredSize } from '@/hooks/useMeasuredSize';
import { colors } from '@/theme/tokens';

type Props = {
  stops: ProfileStop[];
  /** Cumulative km per stop; omit to space stops evenly. */
  km?: number[];
  height?: number;
  color?: string;
  /** Distance already walked, to place a live position on the climb. */
  progressKm?: number | null;
  caption?: string;
  style?: StyleProp<ViewStyle>;
};

export function ElevationProfile({ stops, km, height = 92, color = colors.lime, progressKm = null, caption, style }: Props) {
  const raw = useId();
  const gradientId = `elev-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { measureRef, size, onLayout } = useMeasuredSize();
  const width = size.width;
  const geometry = width > 0 ? buildElevationProfile(stops, km ?? stops.map((_, index) => index), width, height) : null;

  const marker = geometry && progressKm != null ? {
    x: xAtDistance(geometry, progressKm),
    y: elevationY(geometry, progressKm),
  } : null;

  return (
    <View onLayout={onLayout} ref={measureRef} style={[styles.root, style]}>
      <Text style={styles.header}>{caption ?? 'ELEVATION PROFILE'}</Text>
      <View style={{ height }}>
        {geometry ? (
          <Svg width={width} height={height}>
            <Defs>
              <SvgGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.42} />
                <Stop offset="1" stopColor={color} stopOpacity={0.04} />
              </SvgGradient>
            </Defs>
            <Line x1={0} y1={geometry.baseline} x2={width} y2={geometry.baseline} stroke={colors.line} strokeWidth={1} />
            <Path d={geometry.area} fill={`url(#${gradientId})`} />
            <Path d={geometry.line} stroke={color} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={geometry.highest.x} cy={geometry.highest.y} r={4} fill={color} stroke={colors.nightDeep} strokeWidth={1.5} />
            {marker ? <>
              <Line x1={marker.x} y1={4} x2={marker.x} y2={geometry.baseline} stroke={colors.ink} strokeWidth={1.5} strokeDasharray="3 3" />
              <Circle cx={marker.x} cy={marker.y} r={5.5} fill={colors.ink} stroke={color} strokeWidth={2} />
            </> : null}
          </Svg>
        ) : null}
        {geometry ? (
          <>
            <Text style={[styles.extreme, styles.extremeTop]}>{geometry.max.toLocaleString('en-US')} m</Text>
            <Text style={[styles.extreme, styles.extremeBottom]}>{geometry.min.toLocaleString('en-US')} m</Text>
          </>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Text accessibilityRole="summary" style={styles.footerText}>
          {geometry ? `${geometry.markers.length} stops · ${geometry.totalKm.toFixed(1)} km · high ${geometry.highest.name} ${geometry.highest.elevation.toLocaleString('en-US')} m` : 'Loading elevation…'}
        </Text>
        {marker ? <Text style={[styles.footerText, { color }]}>You are here · {progressKm!.toFixed(1)} km in</Text> : null}
      </View>
    </View>
  );
}

function elevationY(geometry: NonNullable<ReturnType<typeof buildElevationProfile>>, walkedKm: number) {
  const clamped = Math.max(0, Math.min(walkedKm, geometry.totalKm));
  const next = geometry.markers.find(marker => marker.km >= clamped) ?? geometry.markers[geometry.markers.length - 1];
  const previous = [...geometry.markers].reverse().find(marker => marker.km <= clamped) ?? geometry.markers[0];
  if (previous === next || next.km === previous.km) return next.y;
  const ratio = (clamped - previous.km) / (next.km - previous.km);
  return previous.y + (next.y - previous.y) * ratio;
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  header: { color: colors.faint, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
  extreme: { position: 'absolute', left: 8, color: colors.muted, fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(8,13,18,0.55)', paddingHorizontal: 5, borderRadius: 4, overflow: 'hidden' },
  extremeTop: { top: 2 },
  extremeBottom: { bottom: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  footerText: { color: colors.faint, fontSize: 11, lineHeight: 16, flexShrink: 1 },
});

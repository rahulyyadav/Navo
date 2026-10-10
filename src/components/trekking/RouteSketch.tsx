import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Text } from "@/components/Typography";
import type { Coordinate } from "@/services/places/types";
import { colors } from "@/theme/tokens";
/** Local route geometry only; no tile requests, location watchers or terrain claims. */
export function RouteSketch({
  segments,
  position,
}: {
  segments: Coordinate[][];
  position: Coordinate | null;
}) {
  const geometry = useMemo(() => {
    const points = segments.flat();
    const lat = points.map((p) => p.latitude),
      lon = points.map((p) => p.longitude),
      minLat = Math.min(...lat),
      maxLat = Math.max(...lat),
      minLon = Math.min(...lon),
      maxLon = Math.max(...lon),
      cos = Math.max(0.01, Math.cos((((maxLat + minLat) / 2) * Math.PI) / 180)),
      scale = 280 / Math.max((maxLon - minLon) * cos, maxLat - minLat, 0.0001);
    const project = (p: Coordinate) => ({
      x: 160 + (p.longitude - (minLon + maxLon) / 2) * cos * scale,
      y: 160 - (p.latitude - (minLat + maxLat) / 2) * scale,
    });
    return {
      project,
      lines: segments.map((segment) =>
        segment
          .map((p) => {
            const q = project(p);
            return `${q.x},${q.y}`;
          })
          .join(" "),
      ),
    };
  }, [segments]);
  const marker = position ? geometry.project(position) : null,
    visible =
      !!marker &&
      marker.x >= 0 &&
      marker.x <= 320 &&
      marker.y >= 0 &&
      marker.y <= 320;
  return (
    <View accessibilityLabel="Offline north-up route geometry overview. Segment gaps remain disconnected.">
      <Svg viewBox="0 0 320 320" width="100%" height={280}>
        {geometry.lines.map((line, i) => (
          <Polyline
            key={i}
            points={line}
            fill="none"
            stroke={colors.lime}
            strokeWidth={3}
          />
        ))}
        {visible && marker && (
          <Circle
            cx={marker.x}
            cy={marker.y}
            r={6}
            fill={colors.info}
            stroke={colors.white}
            strokeWidth={2}
          />
        )}
      </Svg>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
        North is up · saved geometry, without terrain or road context.
        {position && !visible
          ? " Your GPS position is outside this overview."
          : ""}
      </Text>
    </View>
  );
}

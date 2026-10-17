import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { Text } from '@/components/Typography';
import { Card, SectionTitle } from '@/components/ui';
import { elevationProfile } from '@/services/routes/elevation-profile';
import type { ImportedRoute } from '@/services/routes/gpx';
import { colors } from '@/theme/tokens';

export function RouteElevationProfile({ route }: { route: ImportedRoute }) {
  const profile = useMemo(() => elevationProfile(route), [route]);
  return <Card><SectionTitle title="Elevation along your route" />
    {profile ? <>
      <Text style={{color:colors.ink,fontSize:16,lineHeight:24}}>Low {Math.round(profile.lowM)} m · High {Math.round(profile.highM)} m</Text>
      <View accessible accessibilityLabel={`Elevation profile from the imported GPX. Lowest ${Math.round(profile.lowM)} metres, highest ${Math.round(profile.highM)} metres across ${(profile.distanceM/1000).toFixed(2)} kilometres. Separate segments are not joined.`}>
        <Svg width="100%" height={160} viewBox="0 0 320 160">
          <Line x1={10} y1={140} x2={310} y2={140} stroke={colors.line} />
          {profile.segments.map((segment,index) => <Polyline key={index} fill="none" stroke={colors.lime} strokeWidth={2.5} points={segment.map(point => `${10 + point.distanceM/profile.distanceM*300},${profile.highM===profile.lowM ? 75 : 140-(point.elevationM-profile.lowM)/(profile.highM-profile.lowM)*125}`).join(' ')} />)}
        </Svg>
      </View>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:colors.muted}}>0 km</Text><Text style={{color:colors.muted}}>{(profile.distanceM/1000).toFixed(2)} km</Text></View>
      <Text style={{color:colors.muted,fontSize:13,lineHeight:20}}>Source elevation, not a terrain survey. Gaps are not connected.{profile.sampled ? ' The line is simplified for display.' : ''}</Text>
    </> : <Text style={{color:colors.muted,fontSize:14,lineHeight:22}}>A profile needs a continuous elevation value at each point and usable route geometry. This file does not provide a suitable profile; missing heights are not estimated.</Text>}
  </Card>;
}

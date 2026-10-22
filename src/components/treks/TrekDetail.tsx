import { useCallback, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { Text } from '@/components/Typography';
import { HomePressable } from '@/components/journeys/HomeMotion';
import { useReducedMotion } from '@/components/ui';
import { TabIcon } from '@/components/TabIcon';
import { TopStatusBackdrop } from '@/components/TopStatusBackdrop';
import { NepalMap } from '@/components/NepalMap';
import { galleryForTrek } from '@/data/trek-photos';
import { regionForTrek, trekById, trekStats, type Trek, type TrekPoint } from '@/data/treks';
import { useNavo } from '@/context/NavoContext';
import { useTheme } from '@/context/ThemeContext';
import { journeyDestinations } from '@/services/journeys/catalogue';
import { destinationForTrek } from '@/services/trail-discovery';
import { useTrekStyles } from './trek-styles';

type IconName = 'back' | 'info' | 'arrow' | 'clock' | 'peak' | 'season' | 'permit';
function DetailIcon({ name, color, size = 20 }: { name: IconName; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {name === 'back' ? <Path d="M19 12H5m7-7-7 7 7 7"/> : name === 'arrow' ? <Path d="M5 12h14m-7-7 7 7-7 7"/> : name === 'clock' ? <><Circle cx={12} cy={12} r={9}/><Path d="M12 7v5l3 2"/></> : name === 'peak' ? <><Path d="m2 20 10-16 10 16Zm6-10 4 4 4-4"/></> : name === 'season' ? <><Circle cx={12} cy={12} r={4}/><Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></> : name === 'permit' ? <><Path d="M6 3h9l4 4v14H6Zm9 0v5h4M9 12h7m-7 4h5"/></> : <><Circle cx={12} cy={12} r={9}/><Path d="M12 11v6m0-10v.1"/></>}
  </Svg>;
}
export function TrekDetail({ id }: { id: string }) {
  const s = useTrekStyles();
  const { palette, scheme } = useTheme();
  const { isSignedIn } = useNavo();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const sectionsY = useRef(0);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => { setStatusBarStyle(scheme === 'dark' ? 'light' : 'dark'); }, [scheme]));
  const trek = trekById(id);
  const back = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/discover');
  if (!trek) return <View style={s.page}><View style={s.missing}><TabIcon name="route" color={palette.green} size={35}/><Text style={s.sectionTitle}>This trek isn’t here yet.</Text><HomePressable accessibilityRole="button" onPress={back} style={s.plan}><Text style={s.planText}>Back to Home</Text></HomePressable></View></View>;
  const gallery = galleryForTrek(trek);
  const stats = trekStats(trek.route);
  const photo = gallery[selectedPhoto % gallery.length];
  function plan() {
    if (!isSignedIn) { router.push('/login'); return; }
    const destination = journeyDestinations.find(point => point.id === trek!.id) ?? destinationForTrek(trek!);
    if (destination) router.push({ pathname: '/journey-setup', params: { destination: JSON.stringify(destination) } });
  }
  return <View style={[s.page, { paddingTop: insets.top }]}>
    <ScrollView ref={scroll} style={s.scroll} contentContainerStyle={[s.content, { paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 100 }]} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
      <View onLayout={event => { sectionsY.current = event.nativeEvent.layout.y + event.nativeEvent.layout.height + 22; }} style={[s.hero, { minHeight: height * .8 }]}>
        <Animated.View key={selectedPhoto} entering={reduced ? undefined : FadeIn.duration(280)} style={StyleSheet.absoluteFill}>
          <Image source={photo.image} accessibilityLabel={photo.label} resizeMode="cover" style={s.photo}/>
        </Animated.View>
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,.2)', 'transparent', 'rgba(0,0,0,.72)']} locations={[0, .35, 1]} style={StyleSheet.absoluteFill}/>
        <View style={s.toolbar}>
          <HomePressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} style={s.circle}><DetailIcon name="back" color="#FFFFFF"/></HomePressable>
          <Text style={s.toolbarLabel}>TREK OVERVIEW</Text>
          <HomePressable accessibilityRole="button" accessibilityLabel="View trek informations" onPress={() => scroll.current?.scrollTo({ y: sectionsY.current, animated: !reduced })} style={s.circle}><DetailIcon name="info" color="#FFFFFF"/></HomePressable>
        </View>
        <View style={s.photoCount}><Text style={s.photoCountText}>{String(selectedPhoto + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}</Text></View>
        <View style={s.heroDetails}>
          <View style={s.thumbnails}>{gallery.map((item, index) => <HomePressable key={item.source} accessibilityRole="button" accessibilityLabel={`Show photo: ${item.label}`} accessibilityState={{ selected: index === selectedPhoto }} aria-pressed={index === selectedPhoto} onPress={() => setSelectedPhoto(index)} style={[s.thumbnail, index === selectedPhoto && s.thumbnailSelected]}><Image source={item.image} resizeMode="cover" style={s.photo}/></HomePressable>)}</View>
          <View style={s.heading}>
            <View style={s.headingRow}><Text accessibilityRole="header" style={s.title}>{trek.name}</Text><View style={s.difficulty}><Text style={s.difficultyText}>{trek.difficulty}</Text></View></View>
            <View style={s.location}><TabIcon name="pin" color="rgba(255,255,255,.85)" size={15}/><Text style={s.locationText}>{trek.region}, Nepal</Text></View>
          </View>
          <View style={s.stats}>
            <Stat icon="clock" value={trek.days} label="Duration"/>
            <Stat icon="peak" value={`${trek.maxElevation.toLocaleString()} m`} label="High point" divider/>
            <Stat value={`${stats.stops} stops`} label="Reference route" divider/>
          </View>
        </View>
      </View>
      <View style={s.tabHeader}>
        <View style={s.informationPill}><Text accessibilityRole="header" style={s.informationLabel}>Informations</Text></View>
      </View>
      <Animated.View entering={reduced ? undefined : FadeInDown.duration(230)} style={[s.section, s.informationContent]}>
        <Text style={s.copy}>{trek.summary}</Text>
        <View style={s.card}>
          <Fact icon="season" label="Best season" value={trek.bestSeason}/>
          <View style={s.divider}/>
          <Fact icon="permit" label="Permits" value={trek.permit}/>
        </View>
        <RouteDetails trek={trek}/>
      </Animated.View>
    </ScrollView>
    <LinearGradient pointerEvents="box-none" colors={[`rgba(${palette.veilRGB},0)`, `rgba(${palette.veilRGB},.97)`, palette.background]} locations={[0, .4, 1]} style={[s.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={s.width}><HomePressable accessibilityRole="button" accessibilityLabel={isSignedIn ? `Plan ${trek.name} journey` : 'Sign in to plan'} onPress={plan} style={s.plan}><Text style={s.planText}>{isSignedIn ? 'Plan journey' : 'Sign in to plan'}</Text><DetailIcon name="arrow" color={palette.onPrimary}/></HomePressable></View>
    </LinearGradient>
    <TopStatusBackdrop topInset={insets.top}/>
  </View>;
}
function Stat({ value, label, icon, divider }: { value: string; label: string; icon?: IconName; divider?: boolean }) {
  const s = useTrekStyles(); const { palette } = useTheme();
  return <View style={[s.stat, divider && s.statDivider]}><View style={s.statTop}>{icon ? <DetailIcon name={icon} color={palette.green} size={16}/> : <TabIcon name="route" color={palette.green} size={16}/>}<Text style={s.statValue}>{value}</Text></View><Text style={s.statLabel}>{label}</Text></View>;
}
function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const s = useTrekStyles(); const { palette } = useTheme();
  return <View style={s.fact}><View style={s.factIcon}><DetailIcon name={icon} color={palette.green} size={19}/></View><View style={s.factCopy}><Text style={s.factLabel}>{label}</Text><Text style={s.factValue}>{value}</Text></View></View>;
}
function elevationProfile(route: TrekPoint[]) {
  const elevations = route.map(point => point.elevation);
  const min = Math.min(...elevations), max = Math.max(...elevations);
  const span = Math.max(max - min, 1);
  const points = route.map((point, index) => ({ x: 12 + index / Math.max(route.length - 1, 1) * 576, y: 148 - (point.elevation - min) / span * 130, name: point.name }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
  return { points, line, area: `${line} L${points[points.length - 1].x},160 L12,160 Z` };
}
function RouteDetails({ trek }: { trek: Trek }) {
  const s = useTrekStyles(); const { palette } = useTheme();
  const profile = elevationProfile(trek.route);
  const stats = trekStats(trek.route);
  const high = trek.route.reduce((a, b) => a.elevation > b.elevation ? a : b);
  return <>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.sectionTitle}>The climb, at a glance.</Text>
      <View style={s.profileHead}>
        <View style={s.profileEnd}><Text style={s.small}>START · {trek.route[0].name}</Text><Text style={s.profileValue}>{trek.route[0].elevation.toLocaleString()} m</Text></View>
        <View style={[s.profileEnd, s.profileRight]}><Text style={s.small}>HIGH POINT</Text><Text style={[s.profileValue, { color: palette.green }]}>{high.elevation.toLocaleString()} m</Text></View>
      </View>
      <Svg height={150} width="100%" viewBox="0 0 600 170" accessibilityLabel="Approximate stop elevations">
        <Defs><SvgGradient id="trekElevation" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={palette.green} stopOpacity={.25}/><Stop offset="1" stopColor={palette.green} stopOpacity={0}/></SvgGradient></Defs>
        <Path d={profile.area} fill="url(#trekElevation)"/><Path d={profile.line} fill="none" stroke={palette.green} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {profile.points.map(point => <Circle key={point.name} cx={point.x} cy={point.y} r={3.5} stroke={palette.green} strokeWidth={2} fill={palette.surface}/>)}
      </Svg>
      <Text style={s.small}>+{stats.ascent.toLocaleString()} m gain · {stats.descent.toLocaleString()} m descent between listed stops. Spacing is illustrative, not distance.</Text>
    </View>
    <Text accessibilityRole="header" style={s.sectionTitle}>Along the way</Text>
    <View style={s.card}>{trek.route.map((point, index) => <View key={point.name} style={s.stop}><View style={s.rail}><View style={s.stopNumber}><Text style={s.stopNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>{index < trek.route.length - 1 && <View style={s.stopLine}/>}</View><View style={s.stopCopy}><Text style={s.stopName}>{point.name}</Text><Text style={s.small}>{point.elevation.toLocaleString()} m{index === 0 ? ' · Trailhead' : index === trek.route.length - 1 ? ' · Last reference stop' : ''}</Text></View></View>)}</View>
    <Text accessibilityRole="header" style={s.sectionTitle}>In the Himalayas</Text>
    <View style={s.mapFrame}><NepalMap interactive={false} myCoords={null} onSelectTrek={() => undefined} region={regionForTrek(trek)} regionNonce={0} selectedId={trek.id}/></View>
  </>;
}
